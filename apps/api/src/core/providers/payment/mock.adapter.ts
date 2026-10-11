import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import {
  type CreatedOrder,
  type ParsedWebhook,
  type PaymentProvider,
  PaymentProviderError,
  type PaymentWebhookEvent,
  type ProviderPayment,
} from './payment.provider';

interface MockOrder {
  id: string;
  amountPaise: number;
}

const id = (prefix: string) => `${prefix}_mock_${randomUUID().replace(/-/g, '').slice(0, 14)}`;

export function hmacHex(secret: string, data: string | Buffer): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Behaves like Razorpay with HMAC signatures over MOCK_PAYMENT_SECRET, in memory.
 * Amounts ending in 13 paise fail at checkout; refunds process immediately unless
 * `holdRefunds` is set (docs/INTEGRATIONS.md).
 */
@Injectable()
export class MockPaymentAdapter implements PaymentProvider {
  readonly name = 'mock' as const;
  private readonly orders = new Map<string, MockOrder>();
  private readonly payments = new Map<string, ProviderPayment>();
  private readonly refunds = new Map<string, { providerPaymentId: string; amountPaise: number }>();
  /** When true, refunds stay pending until a `refund.processed` webhook (like slow bank refunds). */
  holdRefunds = false;
  private readonly secret: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.secret = config.payments.mockSecret;
  }

  createOrder(input: { amountPaise: number }): Promise<CreatedOrder> {
    const order = { id: id('order'), amountPaise: input.amountPaise };
    this.orders.set(order.id, order);
    return Promise.resolve({ providerOrderId: order.id, keyId: 'rzp_test_mock' });
  }

  verifyPaymentSignature(input: {
    providerOrderId: string;
    providerPaymentId: string;
    signature: string;
  }): boolean {
    return safeEqual(
      hmacHex(this.secret, `${input.providerOrderId}|${input.providerPaymentId}`),
      input.signature,
    );
  }

  fetchPayment(providerPaymentId: string): Promise<ProviderPayment> {
    const p = this.payments.get(providerPaymentId);
    return p
      ? Promise.resolve(p)
      : Promise.reject(new PaymentProviderError('No such payment', 404));
  }

  refund(input: {
    providerPaymentId: string;
    amountPaise: number;
  }): Promise<{ providerRefundId: string; status: 'pending' | 'processed' }> {
    const providerRefundId = id('rfnd');
    this.refunds.set(providerRefundId, {
      providerPaymentId: input.providerPaymentId,
      amountPaise: input.amountPaise,
    });
    return Promise.resolve({
      providerRefundId,
      status: this.holdRefunds ? 'pending' : 'processed',
    });
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    return safeEqual(hmacHex(this.secret, rawBody), signature);
  }

  parseWebhook(rawBody: Buffer): ParsedWebhook {
    const body = JSON.parse(rawBody.toString('utf8')) as {
      id: string;
      type: string;
      event: PaymentWebhookEvent;
    };
    return { eventId: body.id, eventType: body.type, event: body.event, payload: body };
  }

  createLinkedAccount(): Promise<{ linkedAccountId: string }> {
    return Promise.resolve({ linkedAccountId: id('acc') });
  }

  transfer(): Promise<{ providerTransferId: string; status: 'processed' }> {
    return Promise.resolve({ providerTransferId: id('trf'), status: 'processed' });
  }

  // ───────────── simulation helpers (dev routes and tests) ─────────────

  /** What the checkout SDK would return to the app. */
  checkout(
    providerOrderId: string,
    outcome: 'success' | 'failure' = 'success',
  ): { providerPaymentId: string; signature: string; captured: boolean } {
    const order = this.orders.get(providerOrderId);
    if (!order) throw new PaymentProviderError('Unknown order', 404);
    const fails = outcome === 'failure' || order.amountPaise % 100 === 13;
    const payment: ProviderPayment = {
      providerPaymentId: id('pay'),
      providerOrderId,
      status: fails ? 'failed' : 'captured',
      amountPaise: order.amountPaise,
      method: 'upi',
    };
    this.payments.set(payment.providerPaymentId, payment);
    return {
      providerPaymentId: payment.providerPaymentId,
      signature: hmacHex(this.secret, `${providerOrderId}|${payment.providerPaymentId}`),
      captured: !fails,
    };
  }

  /** A signed webhook body as the gateway would POST it. */
  webhook(event: PaymentWebhookEvent, eventId = id('evt')): { body: Buffer; signature: string } {
    const type = event.kind === 'ignored' ? event.type : event.kind;
    const body = Buffer.from(JSON.stringify({ id: eventId, type, event }));
    return { body, signature: hmacHex(this.secret, body) };
  }

  refundEvent(
    providerRefundId: string,
    outcome: 'processed' | 'failed' = 'processed',
  ): PaymentWebhookEvent {
    const r = this.refunds.get(providerRefundId);
    if (!r) throw new PaymentProviderError('Unknown refund', 404);
    return outcome === 'processed'
      ? {
          kind: 'refund.processed',
          providerRefundId,
          providerPaymentId: r.providerPaymentId,
          amountPaise: r.amountPaise,
        }
      : {
          kind: 'refund.failed',
          providerRefundId,
          providerPaymentId: r.providerPaymentId,
          reason: 'bank rejected',
        };
  }

  paymentEvent(providerPaymentId: string): PaymentWebhookEvent {
    const p = this.payments.get(providerPaymentId);
    if (!p) throw new PaymentProviderError('Unknown payment', 404);
    return p.status === 'captured'
      ? {
          kind: 'payment.captured',
          providerOrderId: p.providerOrderId,
          providerPaymentId: p.providerPaymentId,
          amountPaise: p.amountPaise,
          method: p.method,
        }
      : {
          kind: 'payment.failed',
          providerOrderId: p.providerOrderId,
          providerPaymentId: p.providerPaymentId,
          reason: 'declined',
        };
  }
}
