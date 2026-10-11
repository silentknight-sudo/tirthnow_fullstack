import { type Prisma } from '@prisma/client';

export interface CancellationPolicy {
  freeUntilHoursBefore: number;
  penaltyPctAfter: number;
  noShowPct: number;
}

export const DEFAULT_POLICY: CancellationPolicy = {
  freeUntilHoursBefore: 24,
  penaltyPctAfter: 50,
  noShowPct: 100,
};

const int = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fallback;

export function parsePolicy(value: Prisma.JsonValue | undefined): CancellationPolicy {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return DEFAULT_POLICY;
  const v = value as Record<string, unknown>;
  return {
    freeUntilHoursBefore: int(v.freeUntilHoursBefore, 0, 720, DEFAULT_POLICY.freeUntilHoursBefore),
    penaltyPctAfter: int(v.penaltyPctAfter, 0, 100, DEFAULT_POLICY.penaltyPctAfter),
    noShowPct: int(v.noShowPct, 0, 100, DEFAULT_POLICY.noShowPct),
  };
}
