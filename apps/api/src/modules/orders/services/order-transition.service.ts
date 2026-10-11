import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type ActorType, type Order, type OrderStatus, type Prisma } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { InventoryFacade } from '../../inventory';
import { PaymentsFacade } from '../../payments';
import { quoteCancellation } from '../cancellation';
import { ORDER_EVENTS, type OrderEvent } from '../events';
import { canTransition } from '../order-machine';
import { readDetails, toJson } from './order-details';

type Tx = Prisma.TransactionClient;

export interface Actor {
  type: ActorType;
  id: string | null;
}

export interface TransitionOptions {
  reason?: string;
  reasonCode?: string;
  metadata?: Record<string, unknown>;
  /** Only transition when the order is currently in one of these states. */
  expectFrom?: OrderStatus[];
}

const invalid = (from: OrderStatus, to: OrderStatus, actor: ActorType) =>
  new AppException(
    ERROR_CODES.ORDER_INVALID_TRANSITION,
    HttpStatus.CONFLICT,
    `Cannot move an order from ${from} to ${to} as ${actor}`,
    { from, to },
  );

/**
 * The only writer of orders.status (ADR-0004). Each transition locks the order row, checks the
 * state machine, applies side effects in the same transaction (inventory, ledger, refunds),
 * appends history, and emits `order.<status>` after commit. Repeating the current state is a
 * no-op, so duplicate webhooks and retries are harmless.
 */
@Injectable()
export class OrderTransitionService {
  private readonly logger = new Logger(OrderTransitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryFacade,
    private readonly payments: PaymentsFacade,
    private readonly events: EventEmitter2,
  ) {}

  async transition(
    orderId: string,
    to: OrderStatus,
    actor: Actor,
    opts: TransitionOptions = {},
  ): Promise<Order> {
    const afterCommit: (() => Promise<void>)[] = [];

    const { order, event } = await this.prisma.$transaction(
      async (tx): Promise<{ order: Order; event: OrderEvent | null }> => {
        const [locked] = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
        if (!locked) throw AppException.notFound('Order not found');
        const current = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
        if (current.status === to) return { order: current, event: null };
        if (opts.expectFrom && !opts.expectFrom.includes(current.status))
          throw invalid(current.status, to, actor.type);
        if (!canTransition(current.status, to, actor.type))
          throw invalid(current.status, to, actor.type);

        const data = await this.effects(tx, current, to, actor, opts, afterCommit);
        const updated = await tx.order.update({
          where: { id: orderId },
          data: { ...data, status: to },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: current.status,
            toStatus: to,
            actorType: actor.type,
            actorId: actor.id,
            reason: opts.reason ?? null,
            metadata: (opts.metadata ?? {}) as Prisma.InputJsonObject,
          },
        });
        const changed: OrderEvent = {
          orderId,
          code: updated.code,
          type: updated.type,
          userId: updated.userId,
          vendorId: updated.vendorId,
          from: current.status,
          status: to,
          actorType: actor.type,
          reason: opts.reason ?? null,
        };
        return { order: updated, event: changed };
      },
    );

    for (const fn of afterCommit) {
      try {
        await fn();
      } catch (err) {
        this.logger.error({ err, orderId }, 'post-commit order step failed');
      }
    }
    if (event) await this.emit(ORDER_EVENTS[to], event);
    return order;
  }

  async emit(name: string, event: OrderEvent): Promise<void> {
    try {
      await this.events.emitAsync(name, event);
    } catch (err) {
      this.logger.error(
        { err, event: name, orderId: event.orderId },
        'order event listener failed',
      );
    }
  }

  private async effects(
    tx: Tx,
    order: Order,
    to: OrderStatus,
    actor: Actor,
    opts: TransitionOptions,
    afterCommit: (() => Promise<void>)[],
  ): Promise<Prisma.OrderUpdateInput> {
    const details = readDetails(order.details);
    const ref = { orderId: order.id, vendorId: order.vendorId, code: order.code };

    switch (to) {
      case 'confirmed': {
        if (order.totalPaise === 0 || !order.vendorId) return { holdExpiresAt: null };
        const split = await this.payments.recordSale(tx, {
          ...ref,
          vendorId: order.vendorId,
          cityId: details.cityId ?? null,
          orderType: order.type,
          grossPaise: order.totalPaise,
        });
        return {
          holdExpiresAt: null,
          commissionPaise: split.commissionPaise,
          commissionRule: split.ruleId ? { connect: { id: split.ruleId } } : undefined,
        };
      }

      case 'cancelled': {
        await this.releaseHolds(tx, order);
        const saleRecorded = order.status !== 'pending' && order.totalPaise > 0;
        const { refundablePaise } = await this.payments.refundableBalance(tx, order.id);
        const quote = quoteCancellation({
          type: order.type,
          status: order.status,
          actor: actor.type,
          refundablePaise,
          serviceStartsAt: order.serviceStartsAt,
          vendorAccepted: Boolean(details.vendorAcceptedAt),
          policy: details.cancellationPolicy ?? null,
          now: new Date(),
        });
        if (!quote.allowed)
          throw new AppException(
            ERROR_CODES.ORDER_NOT_CANCELLABLE,
            HttpStatus.CONFLICT,
            quote.reason,
          );
        const cancellation = await tx.cancellation.create({
          data: {
            orderId: order.id,
            cancelledByType: actor.type,
            cancelledBy: actor.id,
            reasonCode: opts.reasonCode ?? (actor.type === 'system' ? 'system' : 'other'),
            reasonText: opts.reason ?? null,
            refundablePaise: quote.refundPaise,
            penaltyPaise: quote.penaltyPaise,
          },
        });
        const refund = await this.payments.initiateRefund(tx, {
          order: { ...ref, commissionRuleId: order.commissionRuleId },
          amountPaise: quote.refundPaise,
          retainedPaise: refundablePaise - quote.refundPaise,
          saleRecorded,
          cancellationId: cancellation.id,
          reason: quote.reason,
          initiatedById: actor.id,
          idempotencyKey: `cancel-${order.id}`,
        });
        // Whatever the vendor keeps (cancellation charge) becomes payable now.
        if (saleRecorded) await this.payments.settle(tx, ref);
        if (refund) afterCommit.push(() => this.payments.dispatchRefund(refund.id));
        return { holdExpiresAt: null, details: toJson({ ...details, subStatus: 'cancelled' }) };
      }

      case 'completed':
        await this.payments.settle(tx, ref);
        return { details: toJson({ ...details, subStatus: 'completed' }) };

      case 'in_progress':
        return { details: toJson({ ...details, subStatus: 'in_progress' }) };

      case 'refunded':
      case 'pending':
        return {};
    }
  }

  /** Put held rooms or seats back. */
  async releaseHolds(tx: Tx, order: Order): Promise<void> {
    const d = readDetails(order.details);
    if (d.hotel)
      await this.inventory.releaseRooms(tx, d.hotel.roomTypeId, d.hotel.nights, d.hotel.rooms);
    if (d.experience) await this.inventory.releaseSlot(tx, d.experience.slotId, d.experience.seats);
  }
}
