import { Inject, Injectable } from '@nestjs/common';
import { type CommissionRule, type OrderType, type Prisma } from '@prisma/client';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { type PrismaService } from '../../../core/prisma';
import { pickRule, type SaleSplit, splitSale } from './split';

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CommissionService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  /** Vendor override (vendors.commission_rule_id) wins; otherwise the most specific active rule. */
  async resolveRule(
    db: Db,
    ctx: { vendorId: string; cityId: string | null; orderType: OrderType },
    at = new Date(),
  ): Promise<CommissionRule | null> {
    const vendor = await db.vendor.findUnique({
      where: { id: ctx.vendorId },
      select: { commissionRuleId: true },
    });
    if (vendor?.commissionRuleId) {
      const override = await db.commissionRule.findFirst({
        where: { id: vendor.commissionRuleId, isActive: true },
      });
      if (override) return override;
    }
    const rules = await db.commissionRule.findMany({
      where: {
        isActive: true,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
      },
    });
    return pickRule(rules, ctx);
  }

  split(grossPaise: number, rule: CommissionRule | null): SaleSplit {
    return splitSale(grossPaise, rule, this.config.payments.gstOnCommissionBps);
  }

  ruleById(db: Db, id: string | null): Promise<CommissionRule | null> {
    return id ? db.commissionRule.findUnique({ where: { id } }) : Promise.resolve(null);
  }
}
