import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { type LedgerAccount, type Prisma } from '@prisma/client';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { type PrismaService } from '../../../core/prisma';
import { type SaleSplit, splitSale } from './split';

type Tx = Prisma.TransactionClient;
type Db = PrismaService | Tx;

interface Line {
  account: LedgerAccount;
  debit?: number;
  credit?: number;
}

export interface OrderRef {
  orderId: string;
  vendorId: string | null;
  /** Human order code, kept in the memo for statements. */
  code?: string;
}

/**
 * Double-entry ledger (append-only; every txn balances, enforced by a deferred trigger).
 *
 *   sale       DR platform_clearing        CR vendor_pending, platform_revenue, gst_payable
 *   settle     DR vendor_pending           CR vendor_payable          (service done / cancelled)
 *   refund     DR vendor_*, revenue, gst   CR refunds_payable          (initiated)
 *   refunded   DR refunds_payable          CR platform_clearing        (processed)
 *   unmatched  DR platform_clearing        CR refunds_payable          (late capture)
 *   payout     DR vendor_payable           CR platform_clearing        (paid)
 */
@Injectable()
export class LedgerService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private async post(
    tx: Tx,
    ref: Partial<OrderRef> & { payoutId?: string },
    memo: string,
    lines: Line[],
  ): Promise<string> {
    const txnId = randomUUID();
    for (const l of lines) {
      for (const v of [l.debit ?? 0, l.credit ?? 0]) {
        if (!Number.isSafeInteger(v) || v < 0)
          throw new Error(`ledger ${memo}: invalid amount ${String(v)} on ${l.account}`);
      }
    }
    const rows = lines
      .filter((l) => (l.debit ?? 0) > 0 || (l.credit ?? 0) > 0)
      .map((l) => ({
        txnId,
        account: l.account,
        vendorId: ref.vendorId ?? null,
        orderId: ref.orderId ?? null,
        payoutId: ref.payoutId ?? null,
        debitPaise: BigInt(l.debit ?? 0),
        creditPaise: BigInt(l.credit ?? 0),
        memo: ref.code ? `${memo}:${ref.code}` : memo,
      }));
    if (rows.length > 0) await tx.ledgerEntry.createMany({ data: rows });
    return txnId;
  }

  async recordSale(tx: Tx, ref: OrderRef, split: SaleSplit): Promise<void> {
    await this.post(tx, ref, 'sale', [
      { account: 'platform_clearing', debit: split.grossPaise },
      { account: 'vendor_pending', credit: split.vendorPaise },
      { account: 'platform_revenue', credit: split.commissionPaise },
      { account: 'gst_payable', credit: split.gstPaise },
    ]);
  }

  /** Per-account net (credit − debit) for an order. */
  async orderBalances(db: Db, orderId: string): Promise<Record<LedgerAccount, number>> {
    const rows = await db.ledgerEntry.groupBy({
      by: ['account'],
      where: { orderId },
      _sum: { creditPaise: true, debitPaise: true },
    });
    const out: Record<string, number> = {
      platform_clearing: 0,
      vendor_pending: 0,
      vendor_payable: 0,
      platform_revenue: 0,
      gst_payable: 0,
      refunds_payable: 0,
    };
    for (const r of rows)
      out[r.account] = Number((r._sum.creditPaise ?? 0n) - (r._sum.debitPaise ?? 0n));
    return out;
  }

  /**
   * Refund initiated: re-split the amount the customer keeps paying (`retainedPaise`) with the
   * same rule, and debit the differences — vendor share first from pending, then payable.
   */
  async recordRefundInitiated(
    tx: Tx,
    ref: OrderRef,
    refundPaise: number,
    retainedPaise: number,
    rule: Parameters<typeof splitSale>[1],
  ): Promise<void> {
    const balances = await this.orderBalances(tx, ref.orderId);
    const retained = splitSale(retainedPaise, rule, this.config.payments.gstOnCommissionBps);
    const dCommission = Math.max(0, balances.platform_revenue - retained.commissionPaise);
    const dGst = Math.max(0, balances.gst_payable - retained.gstPaise);
    const dVendor = refundPaise - dCommission - dGst;
    const fromPending = Math.min(Math.max(0, balances.vendor_pending), Math.max(0, dVendor));
    await this.post(tx, ref, 'refund_initiated', [
      { account: 'vendor_pending', debit: fromPending },
      { account: 'vendor_payable', debit: dVendor - fromPending },
      { account: 'platform_revenue', debit: dCommission },
      { account: 'gst_payable', debit: dGst },
      { account: 'refunds_payable', credit: refundPaise },
    ]);
  }

  async recordRefundProcessed(tx: Tx, ref: OrderRef, amountPaise: number): Promise<void> {
    await this.post(tx, ref, 'refund_processed', [
      { account: 'refunds_payable', debit: amountPaise },
      { account: 'platform_clearing', credit: amountPaise },
    ]);
  }

  /** Money captured for an order that is no longer bookable: it is owed back in full. */
  async recordUnmatchedCapture(tx: Tx, ref: OrderRef, amountPaise: number): Promise<void> {
    await this.post(tx, ref, 'unmatched_capture', [
      { account: 'platform_clearing', debit: amountPaise },
      { account: 'refunds_payable', credit: amountPaise },
    ]);
  }

  /** Move the vendor's remaining pending share for an order to payable. */
  async settle(tx: Tx, ref: OrderRef): Promise<number> {
    const { vendor_pending: pending } = await this.orderBalances(tx, ref.orderId);
    if (pending <= 0) return 0;
    await this.post(tx, ref, 'settle', [
      { account: 'vendor_pending', debit: pending },
      { account: 'vendor_payable', credit: pending },
    ]);
    return pending;
  }

  async recordPayoutPaid(
    tx: Tx,
    vendorId: string,
    payoutId: string,
    amountPaise: number,
  ): Promise<void> {
    await this.post(tx, { vendorId, payoutId }, 'payout', [
      { account: 'vendor_payable', debit: amountPaise },
      { account: 'platform_clearing', credit: amountPaise },
    ]);
  }

  async orderVendorId(db: Db, orderId: string): Promise<string | null> {
    const row = await db.ledgerEntry.findFirst({
      where: { orderId, vendorId: { not: null } },
      select: { vendorId: true },
    });
    return row?.vendorId ?? null;
  }

  async vendorBalance(db: Db, vendorId: string, account: LedgerAccount): Promise<number> {
    const r = await db.ledgerEntry.aggregate({
      where: { vendorId, account },
      _sum: { creditPaise: true, debitPaise: true },
    });
    return Number((r._sum.creditPaise ?? 0n) - (r._sum.debitPaise ?? 0n));
  }

  /** Payable that has cleared the settlement hold (credits older than the cutoff, all debits). */
  async vendorPayableClearedBefore(db: Db, vendorId: string, cutoff: Date): Promise<number> {
    const rows = await db.$queryRaw<{ cleared: bigint | null }[]>`
      SELECT COALESCE(SUM(CASE WHEN created_at <= ${cutoff} THEN credit_paise ELSE 0 END), 0)
           - COALESCE(SUM(debit_paise), 0) AS cleared
      FROM ledger_entries WHERE vendor_id = ${vendorId}::uuid AND account = 'vendor_payable'`;
    return Number(rows[0]?.cleared ?? 0n);
  }
}
