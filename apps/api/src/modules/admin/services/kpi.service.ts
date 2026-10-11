import { Injectable } from '@nestjs/common';
import { AppException } from '../../../core/http';
import { addDays, isIsoDate, istDate, istToUtc } from '../../../core/time';
import { AiFacade } from '../../ai';
import { IdentityFacade } from '../../identity';
import { OrdersFacade } from '../../orders';
import { PaymentsFacade } from '../../payments';
import { ReelsFacade } from '../../reels';
import { SafetyFacade } from '../../safety';
import { VendorsFacade } from '../../vendors';
import { type KpiQueryDto } from '../dto/admin.dto';

/** Orders that took money: confirmed or further along. */
const PAID = new Set(['confirmed', 'in_progress', 'completed', 'refunded']);

@Injectable()
export class KpiService {
  constructor(
    private readonly identity: IdentityFacade,
    private readonly orders: OrdersFacade,
    private readonly payments: PaymentsFacade,
    private readonly vendors: VendorsFacade,
    private readonly safety: SafetyFacade,
    private readonly reels: ReelsFacade,
    private readonly ai: AiFacade,
  ) {}

  async kpis(q: KpiQueryDto) {
    const today = istDate(new Date());
    const fromDate = q.from ?? addDays(today, -29);
    const toDate = q.to ?? today;
    if (!isIsoDate(fromDate) || !isIsoDate(toDate) || fromDate > toDate)
      throw AppException.badRequest('from must be a date on or before to');
    if (addDays(fromDate, 366) < toDate)
      throw AppException.badRequest('Range is limited to one year');
    const from = istToUtc(fromDate, 0, 0);
    const to = istToUtc(addDays(toDate, 1), 0, 0);
    const [users, orderRows, finance, vendors, sos, reels, ai] = await Promise.all([
      this.identity.userCounts(from, to),
      this.orders.counts(from, to),
      this.payments.financeSummary(from, to),
      this.vendors.statusCounts(),
      this.safety.counts(from, to),
      this.reels.counts(from),
      this.ai.usage(fromDate, toDate),
    ]);
    const paid = orderRows.filter((r) => PAID.has(r.status));
    const byType: Record<string, { orders: number; gmvPaise: number }> = {};
    for (const r of paid) {
      const t = (byType[r.type] ??= { orders: 0, gmvPaise: 0 });
      t.orders += r.count;
      t.gmvPaise += r.gmvPaise;
    }
    return {
      range: { from: fromDate, to: toDate },
      users,
      orders: {
        created: orderRows.reduce((s, r) => s + r.count, 0),
        paid: paid.reduce((s, r) => s + r.count, 0),
        cancelled: orderRows
          .filter((r) => r.status === 'cancelled')
          .reduce((s, r) => s + r.count, 0),
        gmvPaise: paid.reduce((s, r) => s + r.gmvPaise, 0),
        byType,
      },
      finance,
      vendors: { byStatus: vendors, awaitingReview: vendors.kyc_pending ?? 0 },
      sos: { byStatus: sos, total: Object.values(sos).reduce((s, n) => s + n, 0) },
      reels,
      ai,
    };
  }
}
