import { applyBasisPoints } from '@tirth-now/shared-types';

/** Checkout price (ADR-0021): the vendor's base, less any coupon, plus GST and the platform fee. */
export interface PriceBreakdown {
  basePaise: number;
  discountPaise: number;
  taxPaise: number;
  feePaise: number;
  totalPaise: number;
}

export function priceBreakdown(
  basePaise: number,
  discountPaise: number,
  gstBps: number,
  feeBps: number,
): PriceBreakdown {
  if (!Number.isSafeInteger(basePaise) || basePaise < 0)
    throw new RangeError('base must be non-negative integer paise');
  const discount = Math.min(Math.max(0, discountPaise), basePaise);
  const net = basePaise - discount;
  const tax = applyBasisPoints(net, gstBps);
  const fee = applyBasisPoints(net, feeBps);
  return {
    basePaise,
    discountPaise: discount,
    taxPaise: tax,
    feePaise: fee,
    totalPaise: net + tax + fee,
  };
}

/** What a customer sees on a listing: base + GST + platform fee, no coupon. */
export function displayPrice(basePaise: number, gstBps: number, feeBps: number): number {
  return priceBreakdown(basePaise, 0, gstBps, feeBps).totalPaise;
}

export interface CouponLike {
  kind: 'percent' | 'flat';
  percentBps: number;
  flatPaise: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  startsAt: Date;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}

/** Discount on `basePaise`, or the reason the coupon does not apply. */
export function couponDiscount(
  c: CouponLike,
  basePaise: number,
  now: Date,
): { ok: true; discountPaise: number } | { ok: false; reason: string } {
  if (!c.isActive) return { ok: false, reason: 'This coupon is not active' };
  if (c.startsAt > now) return { ok: false, reason: 'This coupon is not active yet' };
  if (c.endsAt && c.endsAt <= now) return { ok: false, reason: 'This coupon has expired' };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit)
    return { ok: false, reason: 'This coupon has been fully used' };
  if (basePaise < c.minOrderPaise)
    return {
      ok: false,
      reason: `Add items worth ₹${Math.ceil(c.minOrderPaise / 100)} to use this coupon`,
    };
  let d = c.kind === 'percent' ? applyBasisPoints(basePaise, c.percentBps) : c.flatPaise;
  if (c.maxDiscountPaise !== null) d = Math.min(d, c.maxDiscountPaise);
  return { ok: true, discountPaise: Math.min(d, basePaise) };
}
