/**
 * India Standard Time helpers. IST is a fixed UTC+05:30 offset (no DST), so conversions are
 * exact arithmetic. Store UTC; use these only at the edges (inputs in local dates, display).
 */
export const IST_OFFSET_MINUTES = 330;
const OFFSET_MS = IST_OFFSET_MINUTES * 60_000;
const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' calendar date in IST for an instant. */
export function istDate(instant: Date): string {
  return new Date(instant.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes since IST midnight for an instant. */
export function istMinutesOfDay(instant: Date): number {
  const shifted = new Date(instant.getTime() + OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** UTC instant for an IST wall-clock time on an IST calendar date. */
export function istToUtc(date: string, hours: number, minutes: number): Date {
  const [y, m, d] = parseDate(date);
  return new Date(Date.UTC(y, m - 1, d, hours, minutes) - OFFSET_MS);
}

/** Day of week (0 = Sunday) of an IST calendar date. */
export function istWeekday(date: string): number {
  const [y, m, d] = parseDate(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = parseDate(date);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Inclusive list of dates from start to end ('YYYY-MM-DD'). */
export function dateRange(start: string, endInclusive: string): string[] {
  const out: string[] = [];
  for (let cur = start; cur <= endInclusive; cur = addDays(cur, 1)) out.push(cur);
  return out;
}

/** A `@db.Date` value (UTC midnight) for a calendar date. */
export function dbDate(date: string): Date {
  const [y, m, d] = parseDate(date);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Calendar date of a `@db.Date` value. */
export function fromDbDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** HH:MM of a `@db.Time` value (stored as a 1970-01-01 UTC DateTime by Prisma). */
export function fromDbTime(value: Date): { hours: number; minutes: number; text: string } {
  const hours = value.getUTCHours();
  const minutes = value.getUTCMinutes();
  return { hours, minutes, text: `${pad(hours)}:${pad(minutes)}` };
}

export function dbTime(hhmm: string): Date {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) throw new RangeError(`Invalid time ${hhmm}`);
  return new Date(Date.UTC(1970, 0, 1, Number(match[1]), Number(match[2])));
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function parseDate(date: string): [number, number, number] {
  if (!isIsoDate(date)) throw new RangeError(`Invalid date ${date}`);
  return date.split('-').map(Number) as [number, number, number];
}

const pad = (n: number) => String(n).padStart(2, '0');
