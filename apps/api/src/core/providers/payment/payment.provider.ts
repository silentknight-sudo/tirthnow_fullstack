/** Normalised payment-gateway webhook, independent of the provider's payload shape. */
export type PaymentWebhookEvent =
  | {
      kind: 'payment.captured';
      providerOrderId: string;
      providerPaymentId: string;
      amountPaise: number;
      method: string | null;
    }
  | {
      kind: 'payment.failed';
      providerOrderId: string;
      providerPaymentId: string;
      reason: string | null;
    }
  | {
      kind: 'refund.processed';
      providerRefundId: string;
      providerPaymentId: string;
      amountPaise: number;
    }
  | {
      kind: 'refund.failed';
      providerRefundId: string;
      providerPaymentId: string;
      reason: string | null;
    }
  | { kind: 'transfer.processed'; providerTransferId: string }
  | { kind: 'transfer.failed'; providerTransferId: string; reason: string | null }
  | { kind: 'ignored'; type: string };

export interface ParsedWebhook {
  eventId: string;
  eventType: string;
  event: PaymentWebhookEvent;
  payload: unknown;
}

export interface ProviderPayment {
  providerPaymentId: string;
  providerOrderId: string;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';
  amountPaise: number;
  method: string | null;
}

export interface CreatedOrder {
  providerOrderId: string;
  /** Publishable key the app passes to the checkout SDK. */
  keyId: string;
}

/** Razorpay today (orders, payments, refunds, Route transfers); swappable. */
export interface PaymentProvider {
  readonly name: 'mock' | 'razorpay';
  createOrder(input: {
    amountPaise: number;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<CreatedOrder>;
  verifyPaymentSignature(input: {
    providerOrderId: string;
    providerPaymentId: string;
    signature: string;
  }): boolean;
  fetchPayment(providerPaymentId: string): Promise<ProviderPayment>;
  refund(input: {
    providerPaymentId: string;
    amountPaise: number;
    notes: Record<string, string>;
  }): Promise<{ providerRefundId: string; status: 'pending' | 'processed' }>;
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
  parseWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): ParsedWebhook;
  createLinkedAccount(input: {
    vendorId: string;
    legalName: string;
    email: string | null;
    phone: string | null;
    accountNumber: string;
    ifsc: string;
    accountHolder: string;
  }): Promise<{ linkedAccountId: string }>;
  transfer(input: {
    linkedAccountId: string;
    amountPaise: number;
    notes: Record<string, string>;
  }): Promise<{ providerTransferId: string; status: 'pending' | 'processed' }>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}
