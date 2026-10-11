import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { callWithPolicy } from '../call-policy';
import { hmacHex, safeEqual } from './mock.adapter';
import {
  type CreatedOrder,
  type ParsedWebhook,
  type PaymentProvider,
  PaymentProviderError,
  type PaymentWebhookEvent,
  type ProviderPayment,
} from './payment.provider';

const API = 'https://api.razorpay.com';

interface RzpEntity {
  id: string;
  order_id?: string;
  payment_id?: string;
  amount?: number;
  status?: string;
  method?: string;
  error_description?: string | null;
}

interface RzpWebhook {
  event: string;
  payload: {
    payment?: { entity: RzpEntity };
    refund?: { entity: RzpEntity };
    transfer?: { entity: RzpEntity };
  };
}

/**
 * Razorpay REST adapter. Webhooks: HMAC-SHA256(raw body, webhook secret) in
 * X-Razorpay-Signature; event id in X-Razorpay-Event-Id. Non-idempotent calls (refunds,
 * transfers) are never retried automatically.
 */
@Injectable()
export class RazorpayAdapter implements PaymentProvider {
  readonly name = 'razorpay' as const;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const p = config.payments;
    if (!p.razorpayKeyId || !p.razorpayKeySecret || !p.razorpayWebhookSecret)
      throw new Error('Razorpay is not configured');
    this.keyId = p.razorpayKeyId;
    this.keySecret = p.razorpayKeySecret;
    this.webhookSecret = p.razorpayWebhookSecret;
  }

  private async call<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    retries = 0,
  ): Promise<T> {
    return callWithPolicy(
      'razorpay',
      async () => {
        const res = await fetch(`${API}${path}`, {
          method,
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const json = (await res.json()) as T & { error?: { description?: string } };
        if (!res.ok)
          throw new PaymentProviderError(
            json.error?.description ?? `Razorpay ${res.status}`,
            res.status,
          );
        return json;
      },
      { retries, timeoutMs: 15_000 },
    );
  }

  async createOrder(input: {
    amountPaise: number;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<CreatedOrder> {
    // Creating an order has no side effect until paid, so it is safe to retry.
    const order = await this.call<RzpEntity>(
      'POST',
      '/v1/orders',
      { amount: input.amountPaise, currency: 'INR', receipt: input.receipt, notes: input.notes },
      2,
    );
    return { providerOrderId: order.id, keyId: this.keyId };
  }

  verifyPaymentSignature(input: {
    providerOrderId: string;
    providerPaymentId: string;
    signature: string;
  }): boolean {
    return safeEqual(
      hmacHex(this.keySecret, `${input.providerOrderId}|${input.providerPaymentId}`),
      input.signature,
    );
  }

  async fetchPayment(providerPaymentId: string): Promise<ProviderPayment> {
    const p = await this.call<RzpEntity>(
      'GET',
      `/v1/payments/${encodeURIComponent(providerPaymentId)}`,
      undefined,
      2,
    );
    return {
      providerPaymentId: p.id,
      providerOrderId: p.order_id ?? '',
      status: (['created', 'authorized', 'captured', 'failed', 'refunded'].includes(p.status ?? '')
        ? p.status
        : 'created') as ProviderPayment['status'],
      amountPaise: p.amount ?? 0,
      method: p.method ?? null,
    };
  }

  async refund(input: {
    providerPaymentId: string;
    amountPaise: number;
    notes: Record<string, string>;
  }) {
    const r = await this.call<RzpEntity>(
      'POST',
      `/v1/payments/${encodeURIComponent(input.providerPaymentId)}/refund`,
      {
        amount: input.amountPaise,
        speed: 'normal',
        notes: input.notes,
      },
    );
    return {
      providerRefundId: r.id,
      status: r.status === 'processed' ? ('processed' as const) : ('pending' as const),
    };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    return safeEqual(hmacHex(this.webhookSecret, rawBody), signature);
  }

  parseWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): ParsedWebhook {
    const body = JSON.parse(rawBody.toString('utf8')) as RzpWebhook;
    const eventId = headers['x-razorpay-event-id'];
    if (!eventId) throw new PaymentProviderError('Missing X-Razorpay-Event-Id');
    const pay = body.payload.payment?.entity;
    const refund = body.payload.refund?.entity;
    const transfer = body.payload.transfer?.entity;
    let event: PaymentWebhookEvent;
    if (body.event === 'payment.captured' && pay?.order_id) {
      event = {
        kind: 'payment.captured',
        providerOrderId: pay.order_id,
        providerPaymentId: pay.id,
        amountPaise: pay.amount ?? 0,
        method: pay.method ?? null,
      };
    } else if (body.event === 'payment.failed' && pay?.order_id) {
      event = {
        kind: 'payment.failed',
        providerOrderId: pay.order_id,
        providerPaymentId: pay.id,
        reason: pay.error_description ?? null,
      };
    } else if (body.event === 'refund.processed' && refund?.payment_id) {
      event = {
        kind: 'refund.processed',
        providerRefundId: refund.id,
        providerPaymentId: refund.payment_id,
        amountPaise: refund.amount ?? 0,
      };
    } else if (body.event === 'refund.failed' && refund?.payment_id) {
      event = {
        kind: 'refund.failed',
        providerRefundId: refund.id,
        providerPaymentId: refund.payment_id,
        reason: null,
      };
    } else if (body.event === 'transfer.processed' && transfer) {
      event = { kind: 'transfer.processed', providerTransferId: transfer.id };
    } else if (body.event === 'transfer.failed' && transfer) {
      event = {
        kind: 'transfer.failed',
        providerTransferId: transfer.id,
        reason: transfer.error_description ?? null,
      };
    } else {
      event = { kind: 'ignored', type: body.event };
    }
    return { eventId, eventType: body.event, event, payload: body };
  }

  async createLinkedAccount(input: {
    vendorId: string;
    legalName: string;
    email: string | null;
    phone: string | null;
    accountNumber: string;
    ifsc: string;
    accountHolder: string;
  }) {
    // Route linked accounts (v2 Accounts API); KYC for the linked account completes on Razorpay's side.
    const acc = await this.call<RzpEntity>('POST', '/v2/accounts', {
      email: input.email,
      phone: input.phone,
      type: 'route',
      reference_id: input.vendorId,
      legal_business_name: input.legalName,
      business_type: 'proprietorship',
      contact_name: input.accountHolder,
    });
    return { linkedAccountId: acc.id };
  }

  async transfer(input: {
    linkedAccountId: string;
    amountPaise: number;
    notes: Record<string, string>;
  }) {
    const tr = await this.call<RzpEntity>('POST', '/v1/transfers', {
      account: input.linkedAccountId,
      amount: input.amountPaise,
      currency: 'INR',
      notes: input.notes,
    });
    return {
      providerTransferId: tr.id,
      status: tr.status === 'processed' ? ('processed' as const) : ('pending' as const),
    };
  }
}
