import { type ActorType, type OrderStatus, type OrderType } from '@prisma/client';

export interface Policy {
  freeUntilHoursBefore: number;
  penaltyPctAfter: number;
  noShowPct: number;
}

export interface CancellationQuote {
  allowed: boolean;
  refundPaise: number;
  penaltyPaise: number;
  reason: string;
}

/**
 * How much of the captured amount goes back on cancellation. Vendor/admin/system
 * cancellations always refund in full; user cancellations follow the listing's policy.
 * Integer paise throughout; the penalty is rounded down so customers never lose a fraction.
 */
export function quoteCancellation(input: {
  type: OrderType;
  status: OrderStatus;
  actor: ActorType;
  refundablePaise: number;
  serviceStartsAt: Date | null;
  vendorAccepted: boolean;
  policy: Policy | null;
  now: Date;
}): CancellationQuote {
  const full = (reason: string): CancellationQuote => ({
    allowed: true,
    refundPaise: input.refundablePaise,
    penaltyPaise: 0,
    reason,
  });
  if (
    input.status !== 'pending' &&
    input.status !== 'confirmed' &&
    !(input.status === 'in_progress' && input.actor === 'admin')
  ) {
    return {
      allowed: false,
      refundPaise: 0,
      penaltyPaise: 0,
      reason: `Orders that are ${input.status} cannot be cancelled`,
    };
  }
  if (input.actor !== 'user') return full('Cancelled by the provider or Tirth Now — full refund');
  if (input.status === 'pending') return full('Not yet confirmed — nothing is charged');

  if (input.type === 'food') {
    return input.vendorAccepted
      ? {
          allowed: false,
          refundPaise: 0,
          penaltyPaise: 0,
          reason: 'The restaurant has started preparing your order',
        }
      : full('Cancelled before the restaurant accepted — full refund');
  }

  const policy = input.policy ?? { freeUntilHoursBefore: 24, penaltyPctAfter: 50, noShowPct: 100 };
  if (!input.serviceStartsAt) return full('Full refund');
  const hoursBefore = (input.serviceStartsAt.getTime() - input.now.getTime()) / 3_600_000;
  if (hoursBefore >= policy.freeUntilHoursBefore)
    return full(`Free cancellation up to ${policy.freeUntilHoursBefore} h before`);
  const pct = hoursBefore >= 0 ? policy.penaltyPctAfter : policy.noShowPct;
  const penalty = Math.floor((input.refundablePaise * pct) / 100);
  return {
    allowed: true,
    refundPaise: input.refundablePaise - penalty,
    penaltyPaise: penalty,
    reason:
      hoursBefore >= 0
        ? `${pct}% cancellation charge inside ${policy.freeUntilHoursBefore} h`
        : `${pct}% no-show charge after the start time`,
  };
}
