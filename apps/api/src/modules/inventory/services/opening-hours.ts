import { type Prisma } from '@prisma/client';
import { istMinutesOfDay, istWeekday, istDate } from '../../../core/time';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const toMin = (hhmm: string) => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/**
 * `{ "daily": [["07:00","22:30"]], "sun": [["08:00","14:00"]] }` — a weekday key overrides
 * `daily`. Ranges may cross midnight ("18:00"-"02:00"). Missing/invalid hours = always open.
 */
export function isOpenAt(hours: Prisma.JsonValue, at: Date): boolean {
  if (typeof hours !== 'object' || hours === null || Array.isArray(hours)) return true;
  const h = hours as Record<string, unknown>;
  const day = DAYS[istWeekday(istDate(at))] ?? 'sun';
  const ranges = h[day] ?? h.daily;
  if (!Array.isArray(ranges)) return true;
  const now = istMinutesOfDay(at);
  return ranges.some((r) => {
    if (!Array.isArray(r) || r.length !== 2 || typeof r[0] !== 'string' || typeof r[1] !== 'string')
      return false;
    const open = toMin(r[0]);
    const close = toMin(r[1]);
    if (open === null || close === null) return false;
    return open <= close ? now >= open && now < close : now >= open || now < close;
  });
}
