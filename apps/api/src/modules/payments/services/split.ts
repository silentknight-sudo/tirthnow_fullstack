import { applyBasisPoints } from '@tirth-now/shared-types';

export interface CommissionRuleLike {
  id: string;
  percentBps: number;
  flatPaise: number;
  minPaise: number | null;
  maxPaise: number | null;
}

export interface SaleSplit {
  grossPaise: number;
  commissionPaise: number;
  gstPaise: number;
  vendorPaise: number;
  ruleId: string | null;
}

/**
 * Split a sale between vendor and platform. Commission = bps + flat, clamped to [min, max];
 * GST is charged on the commission (platform's service). Every term is integer paise and the
 * parts always add up to the gross; the vendor share never goes negative.
 */
export function splitSale(
  grossPaise: number,
  rule: CommissionRuleLike | null,
  gstBps: number,
): SaleSplit {
  if (!Number.isSafeInteger(grossPaise) || grossPaise < 0)
    throw new RangeError('gross must be non-negative integer paise');
  if (!rule || grossPaise === 0) {
    return {
      grossPaise,
      commissionPaise: 0,
      gstPaise: 0,
      vendorPaise: grossPaise,
      ruleId: rule?.id ?? null,
    };
  }
  let commission = applyBasisPoints(grossPaise, rule.percentBps) + rule.flatPaise;
  if (rule.minPaise !== null) commission = Math.max(commission, rule.minPaise);
  if (rule.maxPaise !== null) commission = Math.min(commission, rule.maxPaise);
  let gst = applyBasisPoints(commission, gstBps);
  if (commission + gst > grossPaise) {
    // Cap so the vendor share is never negative (tiny orders with a flat fee).
    commission = Math.floor((grossPaise * 10_000) / (10_000 + gstBps));
    gst = grossPaise - commission;
  }
  return {
    grossPaise,
    commissionPaise: commission,
    gstPaise: gst,
    vendorPaise: grossPaise - commission - gst,
    ruleId: rule.id,
  };
}

/** Most specific active rule wins: vendor > city > order type > global, then priority. */
export function pickRule<
  R extends {
    vendorId: string | null;
    cityId: string | null;
    orderType: string | null;
    priority: number;
    createdAt: Date;
  },
>(rules: R[], ctx: { vendorId: string; cityId: string | null; orderType: string }): R | null {
  let best: { rule: R; score: number } | null = null;
  for (const r of rules) {
    if (r.vendorId !== null && r.vendorId !== ctx.vendorId) continue;
    if (r.cityId !== null && r.cityId !== ctx.cityId) continue;
    if (r.orderType !== null && r.orderType !== ctx.orderType) continue;
    const score = (r.vendorId ? 8 : 0) + (r.cityId ? 4 : 0) + (r.orderType ? 2 : 0);
    if (
      !best ||
      score > best.score ||
      (score === best.score &&
        (r.priority > best.rule.priority ||
          (r.priority === best.rule.priority && r.createdAt > best.rule.createdAt)))
    ) {
      best = { rule: r, score };
    }
  }
  return best?.rule ?? null;
}
