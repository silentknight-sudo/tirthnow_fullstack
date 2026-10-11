import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type Payout, type PayoutStatus, type Prisma } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { type Queue } from 'bullmq';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import {
  AppException,
  afterCursor,
  NEWEST_FIRST,
  type Page,
  pageSize,
  toPage,
} from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../../../core/providers';
import { QUEUES } from '../../../core/queue';
import { dbDate, fromDbDate, istDate } from '../../../core/time';
import { IdentityFacade } from '../../identity';
import { VendorsFacade } from '../../vendors';
import { type EarningsResponse, type PayoutResponse } from '../dto/payments.dto';
import { PAYMENT_EVENTS, type PayoutEvent } from '../events';
import { LedgerService } from './ledger.service';

type Tx = Prisma.TransactionClient;
interface PendingEvent {
  name: string;
  payload: unknown;
}

export const EXECUTE_PAYOUT_JOB = 'execute-payout';
export const SCHEDULE_PAYOUTS_JOB = 'schedule-payouts';
const IN_FLIGHT: PayoutStatus[] = ['pending_approval', 'approved', 'processing'];

const invalidState = (msg: string) =>
  new AppException(ERROR_CODES.PAYOUT_INVALID_STATE, HttpStatus.CONFLICT, msg);

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly vendors: VendorsFacade,
    private readonly identity: IdentityFacade,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @InjectQueue(QUEUES.payouts) private readonly queue: Queue,
  ) {}

  private cutoff(now = new Date()): Date {
    return new Date(now.getTime() - this.config.payments.payoutHoldDays * 86_400_000);
  }

  private async inFlight(db: Tx | PrismaService, vendorId: string): Promise<number> {
    const r = await db.payout.aggregate({
      where: { vendorId, status: { in: IN_FLIGHT } },
      _sum: { amountPaise: true },
    });
    return Number(r._sum.amountPaise ?? 0n);
  }

  /** Cleared payable not yet covered by a payout in flight. */
  async available(db: Tx | PrismaService, vendorId: string, now = new Date()): Promise<number> {
    return (
      (await this.ledger.vendorPayableClearedBefore(db, vendorId, this.cutoff(now))) -
      (await this.inFlight(db, vendorId))
    );
  }

  /** Daily job: one payout per vendor whose cleared balance reaches the minimum. */
  async scheduleAll(now = new Date()): Promise<number> {
    const vendorIds = await this.vendors.activeVendorIds();
    let created = 0;
    for (const vendorId of vendorIds) {
      const payout = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payout:${vendorId}`}))`;
        const amount = await this.available(tx, vendorId, now);
        if (amount < this.config.payments.payoutMinPaise) return null;
        const last = await tx.payout.findFirst({
          where: { vendorId },
          orderBy: { periodEnd: 'desc' },
        });
        const vendor = await this.vendors.get(vendorId);
        const start = last ? last.periodEnd : dbDate(istDate(vendor?.approvedAt ?? now));
        return tx.payout.create({
          data: {
            vendorId,
            periodStart: start,
            periodEnd: dbDate(istDate(this.cutoff(now))),
            amountPaise: BigInt(amount),
            status: 'pending_approval',
          },
        });
      });
      if (payout) created++;
    }
    this.logger.log({ created }, 'payouts scheduled');
    return created;
  }

  async approve(admin: AuthPrincipal, payoutId: string): Promise<PayoutResponse> {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw AppException.notFound('Payout not found');
    if (
      payout.status !== 'pending_approval' &&
      payout.status !== 'on_hold' &&
      payout.status !== 'failed'
    ) {
      throw invalidState(`Cannot approve a ${payout.status} payout`);
    }
    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'approved',
        approvedById: admin.userId,
        approvedAt: new Date(),
        failureReason: null,
      },
    });
    await this.audit.record({
      actor: admin,
      action: 'payout.approve',
      entityType: 'payout',
      entityId: payoutId,
      before: { status: payout.status },
      after: { status: 'approved' },
    });
    await this.queue.add(
      EXECUTE_PAYOUT_JOB,
      { payoutId },
      { jobId: `payout-${payoutId}-${Date.now()}`, attempts: 3 },
    );
    return toResponse(updated);
  }

  async hold(admin: AuthPrincipal, payoutId: string, reason: string): Promise<PayoutResponse> {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw AppException.notFound('Payout not found');
    if (!['pending_approval', 'approved', 'failed'].includes(payout.status))
      throw invalidState(`Cannot hold a ${payout.status} payout`);
    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'on_hold', failureReason: reason },
    });
    await this.audit.record({
      actor: admin,
      action: 'payout.hold',
      entityType: 'payout',
      entityId: payoutId,
      after: { reason },
    });
    return toResponse(updated);
  }

  /** Payouts-queue job: create the Route transfer. */
  async execute(payoutId: string): Promise<string> {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout || payout.status !== 'approved') return 'skipped';
    const vendor = await this.vendors.get(payout.vendorId);
    if (!vendor) return 'skipped';
    let linkedAccountId = vendor.razorpayLinkedAccountId;
    if (!linkedAccountId) {
      const bank = await this.vendors.primaryBankAccount(vendor.id);
      if (!bank) {
        await this.prisma.payout.update({
          where: { id: payoutId },
          data: { status: 'on_hold', failureReason: 'Vendor has no bank account' },
        });
        return 'on_hold';
      }
      const [owner] = await this.identity.getContacts([vendor.ownerUserId]);
      ({ linkedAccountId } = await this.provider.createLinkedAccount({
        vendorId: vendor.id,
        legalName: vendor.legalName,
        email: owner?.email ?? null,
        phone: owner?.phoneE164 ?? null,
        accountNumber: bank.accountNumber,
        ifsc: bank.ifsc,
        accountHolder: bank.accountHolder,
      }));
      await this.vendors.setLinkedAccountId(vendor.id, linkedAccountId);
      await this.vendors.markBankAccountVerified(bank.id);
    }
    const claimed = await this.prisma.payout.updateMany({
      where: { id: payoutId, status: 'approved' },
      data: { status: 'processing' },
    });
    if (claimed.count !== 1) return 'skipped';
    try {
      const tr = await this.provider.transfer({
        linkedAccountId,
        amountPaise: Number(payout.amountPaise),
        notes: { payoutId },
      });
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: { providerTransferId: tr.providerTransferId },
      });
      if (tr.status === 'processed') {
        const out: PendingEvent[] = [];
        await this.prisma.$transaction((tx) => this.markPaid(tx, out, tr.providerTransferId));
      }
      return tr.status;
    } catch (err) {
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'failed',
          failureReason: err instanceof Error ? err.message : 'transfer failed',
        },
      });
      throw err;
    }
  }

  async markPaid(tx: Tx, out: PendingEvent[], providerTransferId: string): Promise<void> {
    await tx.$executeRaw`SELECT id FROM payouts WHERE provider_transfer_id = ${providerTransferId} FOR UPDATE`;
    const payout = await tx.payout.findUnique({ where: { providerTransferId } });
    if (!payout || payout.status === 'paid') return;
    await tx.payout.update({
      where: { id: payout.id },
      data: { status: 'paid', paidAt: new Date() },
    });
    const amount = Number(payout.amountPaise);
    await this.ledger.recordPayoutPaid(tx, payout.vendorId, payout.id, amount);
    const event: PayoutEvent = {
      payoutId: payout.id,
      vendorId: payout.vendorId,
      amountPaise: amount,
    };
    out.push({ name: PAYMENT_EVENTS.payoutPaid, payload: event });
  }

  async markFailed(
    tx: Tx,
    out: PendingEvent[],
    providerTransferId: string,
    reason: string | null,
  ): Promise<void> {
    const payout = await tx.payout.findUnique({ where: { providerTransferId } });
    if (!payout || payout.status === 'paid') return;
    await tx.payout.update({
      where: { id: payout.id },
      data: { status: 'failed', failureReason: reason ?? 'transfer failed' },
    });
    out.push({
      name: PAYMENT_EVENTS.payoutFailed,
      payload: {
        payoutId: payout.id,
        vendorId: payout.vendorId,
        amountPaise: Number(payout.amountPaise),
        reason,
      },
    });
  }

  // ───────────── reads ─────────────

  async list(q: {
    vendorId?: string;
    status?: PayoutStatus;
    cursor?: string;
    limit?: number;
  }): Promise<Page<PayoutResponse>> {
    const limit = pageSize(q.limit);
    const rows = await this.prisma.payout.findMany({
      where: {
        ...(q.vendorId ? { vendorId: q.vendorId } : {}),
        ...(q.status ? { status: q.status } : {}),
        ...afterCursor(q.cursor),
      },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
    });
    return toPage(rows, limit, toResponse);
  }

  async earnings(vendorId: string): Promise<EarningsResponse> {
    const [pending, payable, available, inFlight, paid] = await Promise.all([
      this.ledger.vendorBalance(this.prisma, vendorId, 'vendor_pending'),
      this.ledger.vendorBalance(this.prisma, vendorId, 'vendor_payable'),
      this.available(this.prisma, vendorId),
      this.inFlight(this.prisma, vendorId),
      this.prisma.payout.aggregate({
        where: { vendorId, status: 'paid' },
        _sum: { amountPaise: true },
      }),
    ]);
    return {
      pendingServicePaise: pending,
      payablePaise: payable,
      availableForPayoutPaise: Math.max(0, available),
      inFlightPayoutsPaise: inFlight,
      paidOutPaise: Number(paid._sum.amountPaise ?? 0n),
      settlementHoldDays: this.config.payments.payoutHoldDays,
    };
  }
}

export function toResponse(p: Payout): PayoutResponse {
  return {
    id: p.id,
    vendorId: p.vendorId,
    periodStart: fromDbDate(p.periodStart),
    periodEnd: fromDbDate(p.periodEnd),
    amountPaise: Number(p.amountPaise),
    status: p.status,
    providerTransferId: p.providerTransferId,
    approvedAt: p.approvedAt?.toISOString() ?? null,
    paidAt: p.paidAt?.toISOString() ?? null,
    failureReason: p.failureReason,
    createdAt: p.createdAt.toISOString(),
  };
}
