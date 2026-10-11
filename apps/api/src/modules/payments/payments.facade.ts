import { Injectable } from '@nestjs/common';
import { type OrderType, type Payment, type Prisma, type Refund } from '@prisma/client';
import { type OrderRef } from './services/ledger.service';
import { type PaymentIntent, PaymentsService } from './services/payments.service';
import { type SaleSplit } from './services/split';

type Tx = Prisma.TransactionClient;

/** Public surface of the payments module (used by orders). */
@Injectable()
export class PaymentsFacade {
  constructor(private readonly payments: PaymentsService) {}

  createIntent(order: {
    orderId: string;
    code: string;
    totalPaise: number;
    userId: string;
  }): Promise<PaymentIntent> {
    return this.payments.createIntent(order);
  }

  verifyCheckout(
    orderId: string,
    input: { providerOrderId: string; providerPaymentId: string; signature: string },
  ): Promise<Payment> {
    return this.payments.verifyCheckout(orderId, input);
  }

  recordSale(
    tx: Tx,
    input: OrderRef & {
      vendorId: string;
      cityId: string | null;
      orderType: OrderType;
      grossPaise: number;
    },
  ): Promise<SaleSplit> {
    return this.payments.recordSale(tx, input);
  }

  settle(tx: Tx, ref: OrderRef): Promise<number> {
    return this.payments.settle(tx, ref);
  }

  refundableBalance(
    tx: Tx,
    orderId: string,
  ): Promise<{ payment: Payment | null; refundablePaise: number }> {
    return this.payments.refundableBalance(tx, orderId);
  }

  initiateRefund(
    tx: Tx,
    input: Parameters<PaymentsService['initiateRefund']>[1],
  ): Promise<Refund | null> {
    return this.payments.initiateRefund(tx, input);
  }

  dispatchRefund(refundId: string): Promise<void> {
    return this.payments.dispatchRefund(refundId);
  }

  capturedOrderIds(orderIds: string[]) {
    return this.payments.capturedOrderIds(orderIds);
  }

  async paymentsForOrder(db: Tx, orderId: string) {
    return db.payment.findMany({
      where: { orderId },
      include: { refunds: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export type { PaymentIntent, SaleSplit };
