import { istMinutesOfDay } from '../../../core/time';

export interface FareRule {
  baseFarePaise: number;
  perKmPaise: number;
  perMinPaise: number;
  minFarePaise: number;
  nightSurchargePct: number;
}

/** 22:00–06:00 IST. */
export function isNight(at: Date): boolean {
  const m = istMinutesOfDay(at);
  return m >= 22 * 60 || m < 6 * 60;
}

/**
 * Metered fare in integer paise: max(min, base + perKm·km + perMin·min), then the night
 * surcharge. Distance and duration use whole metres/seconds; rounding happens once per term.
 */
export function meteredFare(
  rule: FareRule,
  distanceM: number,
  durationS: number,
  at: Date,
): { farePaise: number; night: boolean } {
  const distancePart = Math.round((rule.perKmPaise * distanceM) / 1000);
  const timePart = Math.round((rule.perMinPaise * durationS) / 60);
  const metered = Math.max(rule.minFarePaise, rule.baseFarePaise + distancePart + timePart);
  const night = isNight(at) && rule.nightSurchargePct > 0;
  return {
    farePaise: night ? Math.round((metered * (100 + rule.nightSurchargePct)) / 100) : metered,
    night,
  };
}
