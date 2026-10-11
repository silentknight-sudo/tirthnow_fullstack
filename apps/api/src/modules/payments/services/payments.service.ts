import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type Payment, Prisma, type Refund } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { type Queue } from 'bullmq';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import {
  PAYMENT_PROVIDER,
  type ParsedWebhook,
  type PaymentProvider,
} from '../../../core/providers';
import { QUEUES } from '../../../core/queue';
import {
  PAYMENT_EVENTS,
  type PaymentCapturedEvent,
  type PaymentFailedEvent,
  type RefundProcessedEvent,
} from '../events';
import { CommissionService } from './commission.service';
import { LedgerService, type OrderRef } from './ledger.service';
import { PayoutsService } from './payouts.service';

type Tx = Prisma.TransactionClient;

export const CREATE_REFUND_JOB = 'create-refund';

export interface PaymentIntent {
  paymentId: string;
  provider: string;
  providerOrderId: string;
  keyId: string;
  amountPaise: number;
  currency: 'INR';
}

interface PendingEvent {
  name: string;
  payload: unknown;
}

const REFUNDABLE: Payment['status'][] = ['captured', 'partially_refunded'];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly commission: CommissionService,
    private readonly payouts: PayoutsService,
    private readonly events: EventEmitter2,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @InjectQueue(QUEUES.payments) private readonly queue: Queue,
  ) {}

  // ───────────── intents ─────────────

  /** One gateway order per booking; reused across retries while unpaid. */
  async createIntent(order: {
    orderId: string;
    code: string;
    totalPaise: number;
    userId: string;
  }): Promise<PaymentIntent> {
    const existing = await this.prisma.payment.findFirst({
      where: {
        orderId: order.orderId,
        status: { in: ['created', 'failed'] },
        amountPaise: order.totalPaise,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return {
        paymentId: existing.id,
        provider: existing.provider,
        providerOrderId: existing.providerOrderId,
        keyId: this.keyIdOf(existing),
        amountPaise: existing.amountPaise,
        currency: 'INR',
      };
    }
    const created = await this.provider.createOrder({
      amountPaise: order.totalPaise,
      receipt: order.code,
      notes: { orderId: order.orderId, userId: order.userId },
    });
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.orderId,
        provider: this.provider.name,
        providerOrderId: created.providerOrderId,
        amountPaise: order.totalPaise,
        raw: { keyId: created.keyId },
      },
    });
    return {
      paymentId: payment.id,
      provider: payment.provider,
      providerOrderId: payment.providerOrderId,
      keyId: created.keyId,
      amountPaise: payment.amountPaise,
      currency: 'INR',
    };
  }

  private keyIdOf(p: Payment): string {
    const raw = p.raw;
    return typeof raw === 'object' &&
      raw !== null &&
      !Array.isArray(raw) &&
      typeof raw.keyId === 'string'
      ? raw.keyId
      : '';
  }

  // ───────────── client verification ─────────────

  /** Called by the app after checkout; the webhook remains the source of truth. */
  async verifyCheckout(
    orderId: string,
    input: { providerOrderId: string; providerPaymentId: string; signature: string },
  ): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { providerOrderId: input.providerOrderId },
    });
    if (!payment || payment.orderId !== orderId) throw AppException.notFound('Payment not found');
    if (!this.provider.verifyPaymentSignature(input)) {
      throw new AppException(
        ERROR_CODES.PAYMENT_SIGNATURE_INVALID,
        HttpStatus.BAD_REQUEST,
        'Payment signature is invalid',
      );
    }
    const remote = await this.provider.fetchPayment(input.providerPaymentId);
    if (remote.providerOrderId !== input.providerOrderId)
      throw new AppException(
        ERROR_CODES.PAYMENT_SIGNATURE_INVALID,
        400,
        'Payment does not belong to this order',
      );
    if (remote.status === 'captured') {
      await this.inTx((tx, out) =>
        this.applyCapture(tx, out, {
          providerOrderId: input.providerOrderId,
          providerPaymentId: input.providerPaymentId,
          amountPaise: remote.amountPaise,
          method: remote.method,
        }),
      );
    } else if (remote.status === 'failed') {
      await this.inTx((tx, out) =>
        this.applyFailure(tx, out, input.providerOrderId, input.providerPaymentId, 'declined'),
      );
      throw new AppException(
        ERROR_CODES.PAYMENT_FAILED,
        HttpStatus.PAYMENT_REQUIRED,
        'Payment failed; you can try again',
      );
    }
    return this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  }

  // ───────────── webhooks ─────────────

  /**
   * Idempotent webhook processing: one row per (provider, event id); a delivery whose event is
   * already processed is acknowledged without side effects. Invalid signatures are rejected
   * without storing anything (so they cannot block the genuine event id).
   */
  async handleWebhook(
    providerName: string,
    rawBody: Buffer,
    signature: string,
    headers: Record<string, string | undefined>,
  ): Promise<{ status: 'processed' | 'duplicate' | 'ignored' }> {
    if (providerName !== this.provider.name) throw AppException.notFound();
    if (!this.provider.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn({ provider: providerName }, 'webhook signature rejected');
      throw new AppException(
        ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
        HttpStatus.UNAUTHORIZED,
        'Invalid signature',
      );
    }
    let parsed: ParsedWebhook;
    try {
      parsed = this.provider.parseWebhook(rawBody, headers);
    } catch (err) {
      throw AppException.badRequest(err instanceof Error ? err.message : 'Malformed webhook');
    }
    return this.inTx(async (tx, out) => {
      await tx.paymentEvent.createMany({
        data: [
          {
            provider: providerName,
            providerEventId: parsed.eventId,
            eventType: parsed.eventType,
            payload: parsed.payload as Prisma.InputJsonValue,
            signatureValid: true,
          },
        ],
        skipDuplicates: true,
      });
      const [row] = await tx.$queryRaw<{ id: string; processed_at: Date | null }[]>`
        SELECT id, processed_at FROM payment_events WHERE provider = ${providerName} AND provider_event_id = ${parsed.eventId} FOR UPDATE`;
      if (!row) throw new Error('webhook row missing');
      if (row.processed_at) return { status: 'duplicate' as const };

      const e = parsed.event;
      let paymentId: string | null = null;
      switch (e.kind) {
        case 'payment.captured':
          paymentId = await this.applyCapture(tx, out, e);
          break;
        case 'payment.failed':
          paymentId = await this.applyFailure(
            tx,
            out,
            e.providerOrderId,
            e.providerPaymentId,
            e.reason,
          );
          break;
        case 'refund.processed': {
          const refund = await tx.refund.findUnique({
            where: { providerRefundId: e.providerRefundId },
          });
          if (refund) {
            await this.markRefundProcessed(tx, out, refund);
            paymentId = refund.paymentId;
          }
          break;
        }
        case 'refund.failed': {
          const refund = await tx.refund.findUnique({
            where: { providerRefundId: e.providerRefundId },
          });
          if (refund && refund.status === 'pending') {
            await tx.refund.update({ where: { id: refund.id }, data: { status: 'failed' } });
            out.push({
              name: PAYMENT_EVENTS.refundFailed,
              payload: { refundId: refund.id, reason: e.reason },
            });
          }
          break;
        }
        case 'transfer.processed':
          await this.payouts.markPaid(tx, out, e.providerTransferId);
          break;
        case 'transfer.failed':
          await this.payouts.markFailed(tx, out, e.providerTransferId, e.reason);
          break;
        case 'ignored':
          break;
      }
      await tx.paymentEvent.update({
        where: { id: row.id },
        data: { processedAt: new Date(), paymentId },
      });
      return { status: e.kind === 'ignored' ? ('ignored' as const) : ('processed' as const) };
    });
  }

  /** Mark a payment captured (from webhook or verified checkout). Returns the payment id. */
  private async applyCapture(
    tx: Tx,
    out: PendingEvent[],
    e: {
      providerOrderId: string;
      providerPaymentId: string;
      amountPaise: number;
      method: string | null;
    },
  ): Promise<string | null> {
    const [payment] = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM payments WHERE provider_order_id = ${e.providerOrderId} FOR UPDATE`;
    if (!payment) {
      this.logger.warn({ providerOrderId: e.providerOrderId }, 'capture for unknown order');
      return null;
    }
    const p = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    if (p.status === 'captured' || p.status === 'refunded' || p.status === 'partially_refunded')
      return p.id;
    if (e.amountPaise !== p.amountPaise) {
      this.logger.error(
        { paymentId: p.id, expected: p.amountPaise, got: e.amountPaise },
        'captured amount mismatch',
      );
      await tx.payment.update({
        where: { id: p.id },
        data: { raw: { ...(p.raw as object), mismatch: e } },
      });
      out.push({
        name: PAYMENT_EVENTS.amountMismatch,
        payload: { orderId: p.orderId, paymentId: p.id },
      });
      return p.id;
    }
    await tx.payment.update({
      where: { id: p.id },
      data: {
        status: 'captured',
        providerPaymentId: e.providerPaymentId,
        method: e.method,
        capturedAt: new Date(),
      },
    });
    const event: PaymentCapturedEvent = {
      orderId: p.orderId,
      paymentId: p.id,
      amountPaise: p.amountPaise,
    };
    out.push({ name: PAYMENT_EVENTS.captured, payload: event });
    return p.id;
  }

  private async applyFailure(
    tx: Tx,
    out: PendingEvent[],
    providerOrderId: string,
    providerPaymentId: string,
    reason: string | null,
  ): Promise<string | null> {
    const p = await tx.payment.findUnique({ where: { providerOrderId } });
    if (!p || p.status !== 'created') return p?.id ?? null;
    await tx.payment.update({ where: { id: p.id }, data: { status: 'failed', providerPaymentId } });
    const event: PaymentFailedEvent = { orderId: p.orderId, paymentId: p.id, reason };
    out.push({ name: PAYMENT_EVENTS.failed, payload: event });
    return p.id;
  }

  // ───────────── refunds ─────────────

  async capturedPayment(db: Tx | PrismaService, orderId: string): Promise<Payment | null> {
    return db.payment.findFirst({
      where: { orderId, status: { in: REFUNDABLE } },
      orderBy: { capturedAt: 'desc' },
    });
  }

  /** Amount still refundable: captured minus refunds that are pending or processed. */
  async refundableBalance(
    db: Tx | PrismaService,
    orderId: string,
  ): Promise<{ payment: Payment | null; refundablePaise: number }> {
    const payment = await this.capturedPayment(db, orderId);
    if (!payment) return { payment: null, refundablePaise: 0 };
    const refunded = await db.refund.aggregate({
      where: { paymentId: payment.id, status: { in: ['pending', 'processed'] } },
      _sum: { amountPaise: true },
    });
    return { payment, refundablePaise: payment.amountPaise - (refunded._sum.amountPaise ?? 0) };
  }

  /**
   * Create a refund inside the caller's transaction (ledger entries included). The gateway call
   * happens afterwards on the payments queue (`dispatchRefund`).
   */
  async initiateRefund(
    tx: Tx,
    input: {
      order: OrderRef & { commissionRuleId: string | null };
      amountPaise: number;
      retainedPaise: number;
      saleRecorded: boolean;
      cancellationId: string | null;
      reason: string;
      initiatedById: string | null;
      idempotencyKey: string;
    },
  ): Promise<Refund | null> {
    if (input.amountPaise <= 0) return null;
    const { payment, refundablePaise } = await this.refundableBalance(tx, input.order.orderId);
    if (!payment) return null;
    if (input.amountPaise > refundablePaise) {
      throw new AppException(
        ERROR_CODES.REFUND_INVALID,
        HttpStatus.BAD_REQUEST,
        `At most ${refundablePaise} paise can be refunded`,
      );
    }
    if (input.saleRecorded) {
      const rule = await this.commission.ruleById(tx, input.order.commissionRuleId);
      await this.ledger.recordRefundInitiated(
        tx,
        input.order,
        input.amountPaise,
        input.retainedPaise,
        rule,
      );
    } else {
      await this.ledger.recordUnmatchedCapture(tx, input.order, input.amountPaise);
    }
    return tx.refund.create({
      data: {
        paymentId: payment.id,
        cancellationId: input.cancellationId,
        amountPaise: input.amountPaise,
        reason: input.reason,
        initiatedById: input.initiatedById,
        idempotencyKey: input.idempotencyKey,
      },
    });
  }

  async dispatchRefund(refundId: string, attempt = 0): Promise<void> {
    const jobId =
      attempt === 0 ? `refund-${refundId}` : `refund-${refundId}-retry-${String(attempt)}`;
    await this.queue.add(
      CREATE_REFUND_JOB,
      { refundId },
      { jobId, attempts: 8, backoff: { type: 'exponential', delay: 5_000 } },
    );
  }

  /** Admin: send a refund the gateway rejected again (the ledger already owes it to the customer). */
  async retryRefund(refundId: string): Promise<Refund> {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw AppException.notFound('Refund not found');
    if (refund.status !== 'failed')
      throw new AppException(
        ERROR_CODES.REFUND_INVALID,
        HttpStatus.CONFLICT,
        `Only failed refunds can be retried (this one is ${refund.status})`,
      );
    const updated = await this.prisma.refund.update({
      where: { id: refundId },
      data: { status: 'pending', providerRefundId: null },
    });
    await this.dispatchRefund(refundId, Date.now());
    return updated;
  }

  /** Payments-queue job: ask the gateway to refund (never twice for the same refund). */
  async executeRefund(refundId: string): Promise<string> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });
    if (!refund || refund.status !== 'pending') return 'skipped';
    if (refund.providerRefundId) return 'already-requested';
    if (!refund.payment.providerPaymentId)
      throw new Error(`payment ${refund.paymentId} has no provider payment id`);
    const res = await this.provider.refund({
      providerPaymentId: refund.payment.providerPaymentId,
      amountPaise: refund.amountPaise,
      notes: { refundId: refund.id, orderId: refund.payment.orderId },
    });
    await this.prisma.refund.update({
      where: { id: refund.id },
      data: { providerRefundId: res.providerRefundId },
    });
    if (res.status === 'processed') {
      await this.inTx(async (tx, out) => {
        const fresh = await tx.refund.findUniqueOrThrow({ where: { id: refund.id } });
        await this.markRefundProcessed(tx, out, fresh);
      });
    }
    return res.status;
  }

  private async markRefundProcessed(tx: Tx, out: PendingEvent[], refund: Refund): Promise<void> {
    await tx.$executeRaw`SELECT id FROM refunds WHERE id = ${refund.id}::uuid FOR UPDATE`;
    const locked = await tx.refund.findUnique({ where: { id: refund.id } });
    if (!locked || locked.status === 'processed') return;
    await tx.refund.update({ where: { id: refund.id }, data: { status: 'processed' } });
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: refund.paymentId } });
    const vendorId = await this.ledger.orderVendorId(tx, payment.orderId);
    await this.ledger.recordRefundProcessed(
      tx,
      { orderId: payment.orderId, vendorId },
      refund.amountPaise,
    );
    const processed = await tx.refund.aggregate({
      where: { paymentId: payment.id, status: 'processed' },
      _sum: { amountPaise: true },
    });
    const fully = (processed._sum.amountPaise ?? 0) >= payment.amountPaise;
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: fully ? 'refunded' : 'partially_refunded' },
    });
    const event: RefundProcessedEvent = {
      orderId: payment.orderId,
      refundId: refund.id,
      amountPaise: refund.amountPaise,
      fullyRefunded: fully,
    };
    out.push({ name: PAYMENT_EVENTS.refundProcessed, payload: event });
  }

  /** For reconciliation: which of these orders have a captured payment. */
  async capturedOrderIds(
    orderIds: string[],
  ): Promise<{ orderId: string; paymentId: string; amountPaise: number }[]> {
    if (orderIds.length === 0) return [];
    const rows = await this.prisma.payment.findMany({
      where: { orderId: { in: orderIds }, status: { in: REFUNDABLE } },
      select: { id: true, orderId: true, amountPaise: true },
    });
    return rows.map((r) => ({ orderId: r.orderId, paymentId: r.id, amountPaise: r.amountPaise }));
  }

  // ───────────── ledger hooks used by orders ─────────────

  async recordSale(
    tx: Tx,
    input: OrderRef & {
      vendorId: string;
      cityId: string | null;
      orderType: Parameters<CommissionService['resolveRule']>[1]['orderType'];
      grossPaise: number;
    },
  ) {
    const rule = await this.commission.resolveRule(tx, {
      vendorId: input.vendorId,
      cityId: input.cityId,
      orderType: input.orderType,
    });
    const split = this.commission.split(input.grossPaise, rule);
    await this.ledger.recordSale(tx, input, split);
    return split;
  }

  settle(tx: Tx, ref: OrderRef): Promise<number> {
    return this.ledger.settle(tx, ref);
  }

  /** Run in a transaction and emit collected domain events only after it commits. */
  async inTx<T>(fn: (tx: Tx, out: PendingEvent[]) => Promise<T>): Promise<T> {
    const out: PendingEvent[] = [];
    const result = await this.prisma.$transaction((tx) => fn(tx, out), {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
    // Listeners must not undo a committed payment change; they handle their own retries.
    for (const e of out) {
      try {
        await this.events.emitAsync(e.name, e.payload);
      } catch (err) {
        this.logger.error({ err, event: e.name }, 'payment event listener failed');
      }
    }
    return result;
  }
}
