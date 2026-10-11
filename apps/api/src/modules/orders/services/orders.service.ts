import { randomInt } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { type Order, type OrderStatus, Prisma } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import {
  AppException,
  afterCursor,
  NEWEST_FIRST,
  type Page,
  pageSize,
  toPage,
} from '../../../core/http';
import { t } from '../../../core/i18n';
import { PrismaService } from '../../../core/prisma';
import { SettingsService } from '../../../core/settings';
import { fromDbTime, istToUtc } from '../../../core/time';
import { InventoryFacade } from '../../inventory';
import { PaymentsFacade } from '../../payments';
import { quoteCancellation } from '../cancellation';
import {
  type AdminOrderQueryDto,
  type CancellationPreviewResponse,
  type CancelOrderDto,
  type CreateOrderDto,
  type CreateOrderResponse,
  type OrderQueryDto,
  type OrderResponse,
  type PaymentIntentResponse,
} from '../dto/orders.dto';
import { ORDER_EVENTS } from '../events';
import { type OrderDetails, readDetails, toJson } from './order-details';
import { type Actor, OrderTransitionService } from './order-transition.service';

type Tx = Prisma.TransactionClient;

interface Draft {
  vendorId: string;
  cityId: string | null;
  details: OrderDetails;
  serviceStartsAt: Date;
  serviceEndsAt: Date;
  /** Runs inside the order transaction: holds inventory and returns priced lines. */
  hold: (tx: Tx) => Promise<
    {
      itemType: string;
      refId: string | null;
      stayDate: Date | null;
      quantity: number;
      unitPricePaise: number;
      snapshot: Prisma.InputJsonObject;
    }[]
  >;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const unavailable = (msg: string) =>
  new AppException(ERROR_CODES.INVENTORY_UNAVAILABLE, HttpStatus.CONFLICT, msg);
const ORDER_INCLUDE = {
  items: true,
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.OrderInclude;
type OrderFull = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryFacade,
    private readonly payments: PaymentsFacade,
    private readonly transitions: OrderTransitionService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  // ───────────── create ─────────────

  async create(
    user: AuthPrincipal,
    dto: CreateOrderDto,
    idempotencyKey: string | undefined,
  ): Promise<CreateOrderResponse> {
    const draft = await this.draft(dto);
    draft.details.cityId ??= draft.cityId;
    const fees = await this.settings.get<Record<string, number>>('fees.convenience_paise', {});
    const feePaise = Number.isInteger(fees[dto.type]) ? (fees[dto.type] as number) : 0;

    const order = await this.withUniqueCode(async (code) =>
      this.prisma.$transaction(async (tx) => {
        const lines = await draft.hold(tx);
        const subtotal = lines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);
        const created = await tx.order.create({
          data: {
            code,
            userId: user.userId,
            vendorId: draft.vendorId,
            type: dto.type,
            status: 'pending',
            subtotalPaise: subtotal,
            feePaise,
            totalPaise: subtotal + feePaise,
            serviceStartsAt: draft.serviceStartsAt,
            serviceEndsAt: draft.serviceEndsAt,
            holdExpiresAt: new Date(Date.now() + this.config.payments.orderHoldMinutes * 60_000),
            details: toJson(draft.details),
            idempotencyKey: idempotencyKey ?? null,
            items: {
              create: lines.map((l) => ({ ...l, totalPaise: l.unitPricePaise * l.quantity })),
            },
            statusHistory: {
              create: {
                fromStatus: null,
                toStatus: 'pending',
                actorType: 'user',
                actorId: user.userId,
              },
            },
          },
        });
        return created;
      }),
    );

    await this.transitions.emit(ORDER_EVENTS.created, {
      orderId: order.id,
      code: order.code,
      type: order.type,
      userId: order.userId,
      vendorId: order.vendorId,
      from: null,
      status: 'pending',
      actorType: 'user',
      reason: null,
    });

    if (order.totalPaise === 0) {
      await this.transitions.transition(
        order.id,
        'confirmed',
        { type: 'system', id: null },
        { reason: 'nothing to pay' },
      );
      return { order: await this.response(order.id), payment: null };
    }
    try {
      const intent = await this.payments.createIntent({
        orderId: order.id,
        code: order.code,
        totalPaise: order.totalPaise,
        userId: user.userId,
      });
      return { order: await this.response(order.id), payment: intent };
    } catch (err) {
      this.logger.error({ err, orderId: order.id }, 'payment intent failed; releasing hold');
      await this.transitions.transition(
        order.id,
        'cancelled',
        { type: 'system', id: null },
        { reason: 'payment could not be started', reasonCode: 'payment_init_failed' },
      );
      throw new AppException(
        ERROR_CODES.PROVIDER_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        'Payments are temporarily unavailable, please try again',
      );
    }
  }

  private async withUniqueCode(fn: (code: string) => Promise<Order>): Promise<Order> {
    for (let attempt = 0; ; attempt++) {
      const now = new Date();
      const code = `TN-${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, '0')}-${Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')}`;
      try {
        return await fn(code);
      } catch (err) {
        const codeClash =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          String(err.meta?.target).includes('code');
        if (!codeClash || attempt >= 4) throw err;
      }
    }
  }

  private async draft(dto: CreateOrderDto): Promise<Draft> {
    switch (dto.type) {
      case 'hotel': {
        const h = dto.hotel;
        if (!h) throw AppException.badRequest('hotel details are required');
        const ctx = await this.inventory.hotelStayContext(h.roomTypeId, h.checkIn, h.checkOut);
        if (h.guests > ctx.maxGuests * h.rooms)
          throw AppException.badRequest(
            `${ctx.roomTypeName} fits ${ctx.maxGuests} guests per room`,
          );
        const checkIn = fromDbTime(ctx.checkinTime);
        const checkOut = fromDbTime(ctx.checkoutTime);
        return {
          vendorId: ctx.vendorId,
          cityId: ctx.cityId,
          serviceStartsAt: istToUtc(h.checkIn, checkIn.hours, checkIn.minutes),
          serviceEndsAt: istToUtc(h.checkOut, checkOut.hours, checkOut.minutes),
          details: {
            cityId: ctx.cityId,
            cancellationPolicy: ctx.cancellationPolicy,
            hotel: {
              hotelId: ctx.hotelId,
              hotelName: ctx.hotelName,
              roomTypeId: ctx.roomTypeId,
              roomTypeName: ctx.roomTypeName,
              checkIn: h.checkIn,
              checkOut: h.checkOut,
              nights: ctx.nights,
              rooms: h.rooms,
              guests: h.guests,
              ...(h.guestName ? { guestName: h.guestName } : {}),
              ...(h.guestPhone ? { guestPhone: h.guestPhone } : {}),
              ...(h.specialRequests ? { specialRequests: h.specialRequests } : {}),
              address: ctx.address,
            },
          },
          hold: async (tx) => {
            const nights = await this.inventory.holdRooms(tx, ctx.roomTypeId, ctx.nights, h.rooms);
            return nights.map((n) => ({
              itemType: 'room_night',
              refId: ctx.roomTypeId,
              stayDate: new Date(`${n.date}T00:00:00Z`),
              quantity: h.rooms,
              unitPricePaise: n.pricePaise,
              snapshot: { roomTypeName: ctx.roomTypeName, hotelName: ctx.hotelName },
            }));
          },
        };
      }

      case 'cab': {
        const c = dto.cab;
        if (!c) throw AppException.badRequest('cab details are required');
        const at = new Date(c.pickupAt);
        if (at.getTime() < Date.now() + 10 * 60_000)
          throw AppException.badRequest('Pickup must be at least 10 minutes from now');
        if (at.getTime() > Date.now() + 30 * 86_400_000)
          throw AppException.badRequest('Pickup can be booked up to 30 days ahead');
        const [quote] = await this.inventory.cabQuotes({
          pickup: c.pickup,
          drop: c.drop,
          at,
          vehicleClass: c.vehicleClass,
          vendorId: c.vendorId,
        });
        if (!quote) throw unavailable('This cab is no longer available; get a fresh estimate');
        if (c.passengers && c.passengers > quote.seats)
          throw AppException.badRequest(`A ${c.vehicleClass} seats up to ${quote.seats}`);
        return {
          vendorId: quote.vendorId,
          cityId: (await this.inventory.vendorCityId(quote.vendorId)) ?? null,
          serviceStartsAt: at,
          serviceEndsAt: new Date(at.getTime() + quote.durationS * 1000),
          details: {
            vendorName: quote.vendorName,
            cancellationPolicy: { freeUntilHoursBefore: 1, penaltyPctAfter: 25, noShowPct: 50 },
            cab: {
              vehicleClass: c.vehicleClass,
              pickup: {
                lat: c.pickup.lat,
                lng: c.pickup.lng,
                ...(c.pickup.address ? { address: c.pickup.address } : {}),
              },
              drop: {
                lat: c.drop.lat,
                lng: c.drop.lng,
                ...(c.drop.address ? { address: c.drop.address } : {}),
              },
              pickupAt: at.toISOString(),
              distanceM: quote.distanceM,
              durationS: quote.durationS,
              fixedRoute: quote.fixedRoute,
              ...(c.passengers ? { passengers: c.passengers } : {}),
            },
          },
          hold: () =>
            Promise.resolve([
              {
                itemType: 'cab_trip',
                refId: null,
                stayDate: null,
                quantity: 1,
                unitPricePaise: quote.farePaise,
                snapshot: {
                  vehicleClass: c.vehicleClass,
                  distanceM: quote.distanceM,
                  nightSurcharge: quote.nightSurchargeApplied,
                },
              },
            ]),
        };
      }

      case 'food': {
        const f = dto.food;
        if (!f) throw AppException.badRequest('food details are required');
        const priced = await this.inventory.priceFoodOrder(f.restaurantId, f.items);
        const now = new Date();
        return {
          vendorId: priced.restaurant.vendorId,
          cityId: priced.restaurant.cityId,
          serviceStartsAt: now,
          serviceEndsAt: new Date(now.getTime() + 90 * 60_000),
          details: {
            cityId: priced.restaurant.cityId,
            food: {
              restaurantId: f.restaurantId,
              restaurantName: t(priced.restaurant.nameI18n, 'en'),
              mode: f.mode ?? 'pickup',
              ...(f.notes ? { notes: f.notes } : {}),
            },
          },
          hold: () =>
            Promise.resolve(
              priced.lines.map((l) => ({
                itemType: 'menu_item',
                refId: l.menuItemId,
                stayDate: null,
                quantity: l.quantity,
                unitPricePaise: l.unitPricePaise,
                snapshot: { name: l.name },
              })),
            ),
        };
      }

      case 'experience': {
        const e = dto.experience;
        if (!e) throw AppException.badRequest('experience details are required');
        const ctx = await this.inventory.experienceForSlot(e.slotId);
        return {
          vendorId: ctx.experience.vendorId,
          cityId: ctx.experience.cityId,
          serviceStartsAt: ctx.slot.startsAt,
          serviceEndsAt: new Date(
            ctx.slot.startsAt.getTime() + ctx.experience.durationMin * 60_000,
          ),
          details: {
            cityId: ctx.experience.cityId,
            cancellationPolicy: ctx.cancellationPolicy,
            experience: {
              experienceId: ctx.experience.id,
              title: (ctx.experience.titleI18n as { en?: string }).en ?? '',
              slotId: e.slotId,
              startsAt: ctx.slot.startsAt.toISOString(),
              seats: e.seats,
            },
          },
          hold: async (tx) => {
            const held = await this.inventory.holdSlot(tx, e.slotId, e.seats);
            return [
              {
                itemType: 'experience_seat',
                refId: e.slotId,
                stayDate: null,
                quantity: e.seats,
                unitPricePaise: held.experience.pricePaise,
                snapshot: { title: (held.experience.titleI18n as { en?: string }).en ?? '' },
              },
            ];
          },
        };
      }
    }
  }

  // ───────────── user side ─────────────

  async listMine(user: AuthPrincipal, q: OrderQueryDto): Promise<Page<OrderResponse>> {
    return this.list(
      {
        userId: user.userId,
        ...(q.status ? { status: q.status } : {}),
        ...(q.type ? { type: q.type } : {}),
      },
      q,
    );
  }

  async getMine(user: AuthPrincipal, orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: user.userId },
    });
    if (!order) throw AppException.notFound('Order not found');
    return this.response(orderId);
  }

  async payAgain(user: AuthPrincipal, orderId: string): Promise<PaymentIntentResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: user.userId },
    });
    if (!order) throw AppException.notFound('Order not found');
    if (order.status !== 'pending')
      throw new AppException(
        ERROR_CODES.ORDER_INVALID_TRANSITION,
        HttpStatus.CONFLICT,
        `Order is ${order.status}`,
      );
    if (order.holdExpiresAt && order.holdExpiresAt.getTime() < Date.now())
      throw new AppException(
        ERROR_CODES.ORDER_HOLD_EXPIRED,
        HttpStatus.CONFLICT,
        'Booking hold expired; please book again',
      );
    return this.payments.createIntent({
      orderId: order.id,
      code: order.code,
      totalPaise: order.totalPaise,
      userId: user.userId,
    });
  }

  async verifyPayment(
    user: AuthPrincipal,
    orderId: string,
    input: { providerOrderId: string; providerPaymentId: string; signature: string },
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: user.userId },
    });
    if (!order) throw AppException.notFound('Order not found');
    await this.payments.verifyCheckout(orderId, input);
    return this.response(orderId);
  }

  async previewCancellation(
    user: AuthPrincipal,
    orderId: string,
  ): Promise<CancellationPreviewResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: user.userId },
    });
    if (!order) throw AppException.notFound('Order not found');
    const { refundablePaise } = await this.prisma.$transaction((tx) =>
      this.payments.refundableBalance(tx, orderId),
    );
    const details = readDetails(order.details);
    return quoteCancellation({
      type: order.type,
      status: order.status,
      actor: 'user',
      refundablePaise,
      serviceStartsAt: order.serviceStartsAt,
      vendorAccepted: Boolean(details.vendorAcceptedAt),
      policy: details.cancellationPolicy ?? null,
      now: new Date(),
    });
  }

  async cancelMine(
    user: AuthPrincipal,
    orderId: string,
    dto: CancelOrderDto,
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: user.userId },
    });
    if (!order) throw AppException.notFound('Order not found');
    await this.transitions.transition(
      orderId,
      'cancelled',
      { type: 'user', id: user.userId },
      { reasonCode: dto.reasonCode, reason: dto.reasonText ?? dto.reasonCode },
    );
    return this.response(orderId);
  }

  // ───────────── vendor side ─────────────

  async listForVendor(vendorId: string, q: OrderQueryDto): Promise<Page<OrderResponse>> {
    // Unpaid holds are not actionable for vendors.
    return this.list(
      { vendorId, status: q.status ?? { not: 'pending' }, ...(q.type ? { type: q.type } : {}) },
      q,
    );
  }

  async getForVendor(vendorId: string, orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, vendorId, status: { not: 'pending' } },
    });
    if (!order) throw AppException.notFound('Order not found');
    return this.response(orderId);
  }

  async vendorAction(
    actor: AuthPrincipal,
    vendorId: string,
    orderId: string,
    action: 'accept' | 'reject' | 'start' | 'complete' | 'cancel',
    reason?: string,
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, vendorId, status: { not: 'pending' } },
    });
    if (!order) throw AppException.notFound('Order not found');
    const who: Actor = { type: 'vendor', id: actor.userId };
    switch (action) {
      case 'accept':
        await this.accept(order, who);
        break;
      case 'reject':
        await this.transitions.transition(orderId, 'cancelled', who, {
          reasonCode: 'vendor_rejected',
          reason: reason ?? 'Rejected by the provider',
          expectFrom: ['confirmed'],
        });
        break;
      case 'start':
        await this.transitions.transition(orderId, 'in_progress', who, reason ? { reason } : {});
        break;
      case 'complete':
        await this.transitions.transition(orderId, 'completed', who);
        break;
      case 'cancel':
        await this.transitions.transition(orderId, 'cancelled', who, {
          reasonCode: 'vendor_cancelled',
          reason: reason ?? 'Cancelled by the provider',
        });
        break;
    }
    await this.audit.record({
      actor,
      action: `order.vendor_${action}`,
      entityType: 'order',
      entityId: orderId,
      after: { reason },
    });
    return this.response(orderId);
  }

  /** Vendor acknowledges a confirmed order; cabs get a vehicle and driver assigned. */
  private async accept(order: Order, who: Actor): Promise<void> {
    if (order.status !== 'confirmed')
      throw new AppException(
        ERROR_CODES.ORDER_INVALID_TRANSITION,
        HttpStatus.CONFLICT,
        `Only confirmed orders can be accepted (status: ${order.status})`,
      );
    const details = readDetails(order.details);
    if (details.vendorAcceptedAt) return;
    if (details.cab && order.vendorId) {
      const vehicle = await this.inventory.pickVehicle(
        order.vendorId,
        details.cab.vehicleClass as Parameters<InventoryFacade['pickVehicle']>[1],
      );
      if (!vehicle) throw unavailable('No active vehicle of this class to assign');
      details.cab.vehicle = {
        id: vehicle.id,
        registrationNo: vehicle.registrationNo,
        model: vehicle.model,
        driverName: vehicle.driverName,
        driverPhoneE164: vehicle.driverPhoneE164,
        driverUserId: vehicle.driverUserId,
      };
    }
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        details: toJson({
          ...details,
          vendorAcceptedAt: new Date().toISOString(),
          subStatus: details.cab ? 'driver_assigned' : 'accepted',
        }),
      },
    });
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: 'confirmed',
        toStatus: 'confirmed',
        actorType: who.type,
        actorId: who.id,
        reason: 'accepted',
      },
    });
    await this.transitions.emit(ORDER_EVENTS.accepted, {
      orderId: order.id,
      code: order.code,
      type: order.type,
      userId: order.userId,
      vendorId: order.vendorId,
      from: 'confirmed',
      status: updated.status,
      actorType: who.type,
      reason: 'accepted',
    });
  }

  // ───────────── admin side ─────────────

  async listForAdmin(q: AdminOrderQueryDto): Promise<Page<OrderResponse>> {
    return this.list(
      {
        ...(q.status ? { status: q.status } : {}),
        ...(q.type ? { type: q.type } : {}),
        ...(q.vendorId ? { vendorId: q.vendorId } : {}),
        ...(q.userId ? { userId: q.userId } : {}),
        ...(q.code ? { code: q.code } : {}),
      },
      q,
    );
  }

  async adminCancel(admin: AuthPrincipal, orderId: string, reason: string): Promise<OrderResponse> {
    await this.transitions.transition(
      orderId,
      'cancelled',
      { type: 'admin', id: admin.userId },
      { reasonCode: 'admin_cancelled', reason },
    );
    await this.audit.record({
      actor: admin,
      action: 'order.admin_cancel',
      entityType: 'order',
      entityId: orderId,
      after: { reason },
    });
    return this.response(orderId);
  }

  async adminComplete(admin: AuthPrincipal, orderId: string): Promise<OrderResponse> {
    await this.transitions.transition(orderId, 'completed', { type: 'admin', id: admin.userId });
    await this.audit.record({
      actor: admin,
      action: 'order.admin_complete',
      entityType: 'order',
      entityId: orderId,
    });
    return this.response(orderId);
  }

  /** Goodwill or dispute refund on an order that is under way or done. */
  async adminRefund(
    admin: AuthPrincipal,
    orderId: string,
    amountPaise: number,
    reason: string,
    idempotencyKey: string,
  ): Promise<OrderResponse> {
    const refund = await this.prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
      if (!locked) throw AppException.notFound('Order not found');
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (order.status !== 'in_progress' && order.status !== 'completed') {
        throw new AppException(
          ERROR_CODES.REFUND_INVALID,
          HttpStatus.CONFLICT,
          'Partial refunds apply to orders in progress or completed; cancel confirmed orders instead',
        );
      }
      const { refundablePaise } = await this.payments.refundableBalance(tx, orderId);
      return this.payments.initiateRefund(tx, {
        order: {
          orderId,
          vendorId: order.vendorId,
          code: order.code,
          commissionRuleId: order.commissionRuleId,
        },
        amountPaise,
        retainedPaise: refundablePaise - amountPaise,
        saleRecorded: true,
        cancellationId: null,
        reason,
        initiatedById: admin.userId,
        idempotencyKey: `admin-${idempotencyKey}`,
      });
    });
    if (!refund)
      throw new AppException(
        ERROR_CODES.REFUND_INVALID,
        HttpStatus.CONFLICT,
        'Nothing was captured for this order',
      );
    await this.payments.dispatchRefund(refund.id);
    await this.audit.record({
      actor: admin,
      action: 'order.admin_refund',
      entityType: 'order',
      entityId: orderId,
      after: { amountPaise, reason, refundId: refund.id },
    });
    return this.response(orderId);
  }

  // ───────────── payment events ─────────────

  /** Confirm a paid order; a payment that lands after the hold was released is refunded. */
  async applyCapturedPayment(
    orderId: string,
    paymentId: string,
  ): Promise<'confirmed' | 'refunded' | 'noop'> {
    try {
      const order = await this.transitions.transition(
        orderId,
        'confirmed',
        { type: 'provider', id: null },
        { reason: 'payment captured', metadata: { paymentId }, expectFrom: ['pending'] },
      );
      return order.status === 'confirmed' ? 'confirmed' : 'noop';
    } catch (err) {
      if (!(err instanceof AppException) || err.code !== ERROR_CODES.ORDER_INVALID_TRANSITION)
        throw err;
    }
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.status !== 'cancelled') return 'noop';
    const refund = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.refund.findUnique({
        where: { idempotencyKey: `late-capture-${paymentId}` },
      });
      if (existing) return null;
      const { refundablePaise } = await this.payments.refundableBalance(tx, orderId);
      return this.payments.initiateRefund(tx, {
        order: { orderId, vendorId: order.vendorId, code: order.code, commissionRuleId: null },
        amountPaise: refundablePaise,
        retainedPaise: 0,
        saleRecorded: false,
        cancellationId: null,
        reason: 'Payment received after the booking hold expired',
        initiatedById: null,
        idempotencyKey: `late-capture-${paymentId}`,
      });
    });
    if (refund) {
      await this.payments.dispatchRefund(refund.id);
      this.logger.warn({ orderId, paymentId }, 'late capture refunded');
      return 'refunded';
    }
    return 'noop';
  }

  async markRefunded(orderId: string): Promise<void> {
    try {
      await this.transitions.transition(
        orderId,
        'refunded',
        { type: 'system', id: null },
        { reason: 'fully refunded' },
      );
    } catch (err) {
      if (!(err instanceof AppException) || err.code !== ERROR_CODES.ORDER_INVALID_TRANSITION)
        throw err;
    }
  }

  // ───────────── reads ─────────────

  private async list(
    where: Prisma.OrderWhereInput,
    q: { cursor?: string; limit?: number },
  ): Promise<Page<OrderResponse>> {
    const limit = pageSize(q.limit);
    const rows = await this.prisma.order.findMany({
      where: { ...where, ...afterCursor(q.cursor) },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
      include: ORDER_INCLUDE,
    });
    const page = toPage(rows, limit);
    return { nextCursor: page.nextCursor, data: page.data.map((o) => this.toResponse(o, false)) };
  }

  async response(orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    const payments = await this.prisma.$transaction((tx) =>
      this.payments.paymentsForOrder(tx, orderId),
    );
    const refunded = payments
      .flatMap((p) => p.refunds)
      .filter((r) => r.status === 'processed')
      .reduce((s, r) => s + r.amountPaise, 0);
    return Object.assign(this.toResponse(order, true), { refundedPaise: refunded });
  }

  private toResponse(o: OrderFull, withHistory: boolean): OrderResponse {
    const details = readDetails(o.details);
    return {
      id: o.id,
      code: o.code,
      type: o.type,
      status: o.status,
      subStatus: details.subStatus ?? null,
      userId: o.userId,
      vendorId: o.vendorId,
      subtotalPaise: o.subtotalPaise,
      taxPaise: o.taxPaise,
      feePaise: o.feePaise,
      discountPaise: o.discountPaise,
      totalPaise: o.totalPaise,
      serviceStartsAt: o.serviceStartsAt?.toISOString() ?? null,
      serviceEndsAt: o.serviceEndsAt?.toISOString() ?? null,
      holdExpiresAt: o.holdExpiresAt?.toISOString() ?? null,
      details,
      items: o.items.map((i) => ({
        itemType: i.itemType,
        refId: i.refId,
        stayDate: i.stayDate ? i.stayDate.toISOString().slice(0, 10) : null,
        quantity: i.quantity,
        unitPricePaise: i.unitPricePaise,
        totalPaise: i.totalPaise,
        snapshot: i.snapshot,
      })),
      ...(withHistory
        ? {
            history: o.statusHistory.map((h) => ({
              from: h.fromStatus,
              to: h.toStatus,
              actorType: h.actorType,
              reason: h.reason,
              at: h.createdAt.toISOString(),
            })),
          }
        : {}),
      createdAt: o.createdAt.toISOString(),
    };
  }

  // ───────────── jobs ─────────────

  /** Cancel unpaid orders whose hold expired (confirming any that were in fact paid). */
  async expireHolds(now = new Date()): Promise<{ confirmed: number; cancelled: number }> {
    const expired = await this.prisma.order.findMany({
      where: { status: 'pending', holdExpiresAt: { lt: now } },
      select: { id: true },
      take: 200,
    });
    const paid = new Map(
      (await this.payments.capturedOrderIds(expired.map((o) => o.id))).map((p) => [
        p.orderId,
        p.paymentId,
      ]),
    );
    let confirmed = 0;
    let cancelled = 0;
    for (const o of expired) {
      try {
        const paymentId = paid.get(o.id);
        if (paymentId) {
          if ((await this.applyCapturedPayment(o.id, paymentId)) === 'confirmed') confirmed++;
        } else {
          await this.transitions.transition(
            o.id,
            'cancelled',
            { type: 'system', id: null },
            {
              reasonCode: 'hold_expired',
              reason: 'Payment not completed in time',
              expectFrom: ['pending'],
            },
          );
          cancelled++;
        }
      } catch (err) {
        this.logger.error({ err, orderId: o.id }, 'hold expiry failed');
      }
    }
    return { confirmed, cancelled };
  }

  /** Complete orders well past their service end that nobody closed. */
  async autoComplete(now = new Date()): Promise<number> {
    const due = await this.prisma.order.findMany({
      where: {
        status: { in: ['confirmed', 'in_progress'] as OrderStatus[] },
        serviceEndsAt: { lt: new Date(now.getTime() - 6 * 3_600_000) },
      },
      select: { id: true },
      take: 200,
    });
    let n = 0;
    for (const o of due) {
      try {
        await this.transitions.transition(
          o.id,
          'completed',
          { type: 'system', id: null },
          { reason: 'auto-completed after service end' },
        );
        n++;
      } catch (err) {
        this.logger.error({ err, orderId: o.id }, 'auto-complete failed');
      }
    }
    return n;
  }
}
