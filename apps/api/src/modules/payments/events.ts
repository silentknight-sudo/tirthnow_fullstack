export const PAYMENT_EVENTS = {
  captured: 'payment.captured',
  failed: 'payment.failed',
  amountMismatch: 'payment.amount_mismatch',
  refundProcessed: 'refund.processed',
  refundFailed: 'refund.failed',
  payoutPaid: 'payout.paid',
  payoutFailed: 'payout.failed',
} as const;

export interface PaymentCapturedEvent {
  orderId: string;
  paymentId: string;
  amountPaise: number;
}

export interface PaymentFailedEvent {
  orderId: string;
  paymentId: string;
  reason: string | null;
}

export interface RefundProcessedEvent {
  orderId: string;
  refundId: string;
  amountPaise: number;
  /** Everything captured for the order has now been refunded. */
  fullyRefunded: boolean;
}

export interface PayoutEvent {
  payoutId: string;
  vendorId: string;
  amountPaise: number;
  reason?: string;
}
