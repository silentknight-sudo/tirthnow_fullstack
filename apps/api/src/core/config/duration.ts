const UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86_400 };

/** Parse "900", "15m", "12h", "30d" into seconds. */
export function parseDurationSeconds(input: string): number {
  const match = /^(\d+)\s*([smhd]?)$/.exec(input.trim());
  if (!match?.[1]) throw new Error(`Invalid duration "${input}" (use e.g. 900, 15m, 12h, 30d)`);
  const unit = match[2] === undefined || match[2] === '' ? 's' : match[2];
  return Number(match[1]) * (UNIT_SECONDS[unit] ?? 1);
}
