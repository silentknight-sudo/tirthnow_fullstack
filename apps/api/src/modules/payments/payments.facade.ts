import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma';
import { type OrderType, type Payment, type Prisma, type Refund } from '@prisma/client';
import { type OrderRef } from './services/ledger.service';
import { type PaymentIntent, PaymentsService } from './services/payments.service';
import { type SaleSplit } from './services/split';

type Tx = Prisma.TransactionClient;

/** Public surface of the payments module (used by orders). */
@Injectable()
export class PaymentsFacade {
  constructor(
    private readonly payments: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

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
  /** Net platform revenue, GST collected and refunds paid in a period (from the ledger). */
  async financeSummary(
    from: Date,
    to: Date,
  ): Promise<{ revenuePaise: number; gstPaise: number; refundsPaise: number }> {
    const rows = await this.prisma.ledgerEntry.groupBy({
      by: ['account'],
      where: {
        createdAt: { gte: from, lt: to },
        account: { in: ['platform_revenue', 'gst_payable', 'refunds_payable'] },
      },
      _sum: { creditPaise: true, debitPaise: true },
    });
    const sums = (account: string) => {
      const r = rows.find((x) => x.account === account);
      return { credit: Number(r?._sum.creditPaise ?? 0n), debit: Number(r?._sum.debitPaise ?? 0n) };
    };
    const revenue = sums('platform_revenue');
    const gst = sums('gst_payable');
    // refunds_payable is debited when the gateway confirms a refund.
    return {
      revenuePaise: revenue.credit - revenue.debit,
      gstPaise: gst.credit - gst.debit,
      refundsPaise: sums('refunds_payable').debit,
    };
  }
}

export type { PaymentIntent, SaleSplit };
