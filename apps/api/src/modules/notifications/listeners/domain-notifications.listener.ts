import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { type Order } from '@prisma/client';
import { ORDER_EVENTS, type OrderDetails, type OrderEvent, OrdersFacade } from '../../orders';
import { PAYMENT_EVENTS, type PayoutEvent, type RefundProcessedEvent } from '../../payments';
import { VENDOR_EVENTS, VendorsFacade, type VendorStatusEvent } from '../../vendors';
import { NotificationsService } from '../services/notifications.service';
import { formatInr } from '../templates';

const ASYNC = { async: true, promisify: true } as const;

/** Short, language-neutral description of what was booked, e.g. "Radha Residency · Deluxe". */
export function orderSummary(order: Pick<Order, 'type'>, d: OrderDetails): string {
  if (d.hotel) return `${d.hotel.hotelName} · ${d.hotel.checkIn} → ${d.hotel.checkOut}`;
  if (d.cab) return `${d.vendorName ?? 'Cab'} · ${d.cab.vehicleClass}`;
  if (d.food) return d.food.restaurantName;
  if (d.experience) return d.experience.title;
  return order.type;
}

/** Turns domain events from other modules into user and vendor notifications. */
@Injectable()
export class DomainNotificationsListener {
  private readonly logger = new Logger(DomainNotificationsListener.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly orders: OrdersFacade,
    private readonly vendors: VendorsFacade,
  ) {}

  @OnEvent(ORDER_EVENTS.confirmed, ASYNC)
  async confirmed(e: OrderEvent): Promise<void> {
    await this.safely('order.confirmed', async () => {
      const ctx = await this.context(e);
      await this.notifications.notifyUsers({
        userIds: [e.userId],
        key: 'order_confirmed',
        vars: ctx.vars,
        payload: ctx.payload,
      });
      if (e.vendorId) {
        const staff = await this.vendors.memberUserIds(e.vendorId, 'orders.manage');
        await this.notifications.notifyUsers({
          userIds: staff,
          key: 'vendor_new_order',
          vars: ctx.vars,
          payload: { ...ctx.payload, vendorId: e.vendorId },
        });
      }
    });
  }

  @OnEvent(ORDER_EVENTS.accepted, ASYNC)
  async accepted(e: OrderEvent): Promise<void> {
    await this.safely('order.accepted', async () => {
      const ctx = await this.context(e);
      const v = ctx.details.cab?.vehicle;
      const extra = v ? `${v.driverName ?? 'Driver'} · ${v.registrationNo}` : '';
      await this.notifications.notifyUsers({
        userIds: [e.userId],
        key: 'order_accepted',
        vars: { ...ctx.vars, extra },
        payload: ctx.payload,
      });
    });
  }

  @OnEvent(ORDER_EVENTS.in_progress, ASYNC)
  async started(e: OrderEvent): Promise<void> {
    await this.safely('order.in_progress', async () => {
      const ctx = await this.context(e);
      await this.notifications.notifyUsers({
        userIds: [e.userId],
        key: 'order_started',
        vars: ctx.vars,
        payload: ctx.payload,
      });
    });
  }

  @OnEvent(ORDER_EVENTS.completed, ASYNC)
  async completed(e: OrderEvent): Promise<void> {
    await this.safely('order.completed', async () => {
      const ctx = await this.context(e);
      await this.notifications.notifyUsers({
        userIds: [e.userId],
        key: 'order_completed',
        vars: ctx.vars,
        payload: { ...ctx.payload, action: 'review' },
      });
    });
  }

  @OnEvent(ORDER_EVENTS.cancelled, ASYNC)
  async cancelled(e: OrderEvent): Promise<void> {
    // Unpaid holds expiring are not news to anyone.
    if (e.from === 'pending') return;
    await this.safely('order.cancelled', async () => {
      const ctx = await this.context(e);
      const extra =
        e.actorType === 'user'
          ? 'Any refund due is on its way.'
          : 'You will receive a full refund.';
      await this.notifications.notifyUsers({
        userIds: [e.userId],
        key: 'order_cancelled',
        vars: { ...ctx.vars, extra },
        payload: ctx.payload,
      });
      if (e.vendorId && e.actorType !== 'vendor') {
        const staff = await this.vendors.memberUserIds(e.vendorId, 'orders.manage');
        await this.notifications.notifyUsers({
          userIds: staff,
          key: 'vendor_order_cancelled',
          vars: ctx.vars,
          payload: { ...ctx.payload, vendorId: e.vendorId },
        });
      }
    });
  }

  @OnEvent(PAYMENT_EVENTS.refundProcessed, ASYNC)
  async refund(e: RefundProcessedEvent): Promise<void> {
    await this.safely('refund.processed', async () => {
      const order = await this.orders.get(e.orderId);
      if (!order) return;
      await this.notifications.notifyUsers({
        userIds: [order.userId],
        key: 'refund_processed',
        vars: { amount: formatInr(e.amountPaise), code: order.code },
        payload: { type: 'order', orderId: order.id },
      });
    });
  }

  @OnEvent(PAYMENT_EVENTS.payoutPaid, ASYNC)
  async payoutPaid(e: PayoutEvent): Promise<void> {
    await this.payout(e, 'payout_paid');
  }

  @OnEvent(PAYMENT_EVENTS.payoutFailed, ASYNC)
  async payoutFailed(e: PayoutEvent): Promise<void> {
    await this.payout(e, 'payout_failed');
  }

  @OnEvent(VENDOR_EVENTS.approved, ASYNC)
  async vendorApproved(e: VendorStatusEvent): Promise<void> {
    await this.vendorStatus(e, 'approved', 'You can now publish listings and take bookings.');
  }

  @OnEvent(VENDOR_EVENTS.rejected, ASYNC)
  async vendorRejected(e: VendorStatusEvent): Promise<void> {
    await this.vendorStatus(e, 'needs changes', e.reason ?? '');
  }

  @OnEvent(VENDOR_EVENTS.suspended, ASYNC)
  async vendorSuspended(e: VendorStatusEvent): Promise<void> {
    await this.vendorStatus(e, 'suspended', e.reason ?? '');
  }

  @OnEvent(VENDOR_EVENTS.reinstated, ASYNC)
  async vendorReinstated(e: VendorStatusEvent): Promise<void> {
    await this.vendorStatus(e, 'reinstated', '');
  }

  private async payout(e: PayoutEvent, key: 'payout_paid' | 'payout_failed'): Promise<void> {
    await this.safely(key, async () => {
      const finance = await this.vendors.memberUserIds(e.vendorId, 'finance.view');
      await this.notifications.notifyUsers({
        userIds: finance,
        key,
        vars: { amount: formatInr(e.amountPaise) },
        payload: { type: 'payout', payoutId: e.payoutId, vendorId: e.vendorId },
      });
    });
  }

  private async vendorStatus(e: VendorStatusEvent, status: string, note: string): Promise<void> {
    await this.safely('vendor.status', async () => {
      const vendor = await this.vendors.get(e.vendorId);
      await this.notifications.notifyUsers({
        userIds: [e.ownerUserId],
        key: 'vendor_status',
        vars: { business: vendor?.displayName ?? 'Your business', status, note },
        payload: { type: 'vendor', vendorId: e.vendorId },
      });
    });
  }

  private async context(e: OrderEvent) {
    const order = await this.orders.get(e.orderId);
    const details = order?.parsed ?? {};
    return {
      details,
      vars: { code: e.code, summary: order ? orderSummary(order, details) : e.type },
      payload: { type: 'order', orderId: e.orderId, status: e.status },
    };
  }

  /** Notifications must never break the action that triggered them. */
  private async safely(what: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.error({ err, event: what }, 'notification fan-out failed');
    }
  }
}
