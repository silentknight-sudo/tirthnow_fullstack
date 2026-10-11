import { dateRange, fromDbDate, fromDbTime, istToUtc, istWeekday } from '../../../core/time';

/** Rough season split used when a schedule says `summer`/`winter` without explicit dates. */
const SUMMER_MONTHS = new Set([4, 5, 6, 7, 8, 9, 10]);

export function seasonOf(date: string): 'summer' | 'winter' {
  return SUMMER_MONTHS.has(Number(date.slice(5, 7))) ? 'summer' : 'winter';
}

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

export interface Recurrence {
  freq: 'DAILY' | 'WEEKLY';
  byDay: number[] | null;
}

/** Supported subset of RFC 5545 RRULE: `FREQ=DAILY` and `FREQ=WEEKLY;BYDAY=MO,TH`. */
export function parseRecurrence(rule: string): Recurrence {
  const parts = new Map(
    rule
      .split(';')
      .filter(Boolean)
      .map((p) => {
        const [k, v] = p.split('=');
        return [k?.trim().toUpperCase() ?? '', v?.trim().toUpperCase() ?? ''] as const;
      }),
  );
  const freq = parts.get('FREQ');
  if (freq === 'DAILY' && parts.size === 1) return { freq: 'DAILY', byDay: null };
  if (freq === 'WEEKLY') {
    const byDay = (parts.get('BYDAY') ?? '').split(',').filter(Boolean);
    const indexes = byDay.map((d) => WEEKDAYS.indexOf(d as (typeof WEEKDAYS)[number]));
    if (
      indexes.length > 0 &&
      indexes.every((i) => i >= 0) &&
      [...parts.keys()].every((k) => k === 'FREQ' || k === 'BYDAY')
    ) {
      return { freq: 'WEEKLY', byDay: indexes };
    }
  }
  throw new RangeError(
    `Unsupported recurrence "${rule}" (use FREQ=DAILY or FREQ=WEEKLY;BYDAY=MO,TU)`,
  );
}

export interface ScheduleLike {
  id: string;
  templeId: string;
  localTime: Date;
  durationMin: number;
  recurrence: string;
  validFrom: Date | null;
  validTo: Date | null;
  season: string;
}

export interface Occurrence<S> {
  schedule: S;
  date: string;
  localTime: string;
  startsAt: Date;
  endsAt: Date;
}

/** Expand schedules into concrete UTC occurrences for IST dates [from, to]. */
export function expandSchedules<S extends ScheduleLike>(
  schedules: S[],
  from: string,
  to: string,
): Occurrence<S>[] {
  const dates = dateRange(from, to);
  const out: Occurrence<S>[] = [];
  for (const s of schedules) {
    let rule: Recurrence;
    try {
      rule = parseRecurrence(s.recurrence);
    } catch {
      continue; // invalid rules are rejected on write; skip defensively
    }
    const validFrom = s.validFrom ? fromDbDate(s.validFrom) : null;
    const validTo = s.validTo ? fromDbDate(s.validTo) : null;
    const time = fromDbTime(s.localTime);
    for (const date of dates) {
      if (validFrom && date < validFrom) continue;
      if (validTo && date > validTo) continue;
      if (s.season !== 'all' && s.season !== seasonOf(date)) continue;
      if (rule.byDay && !rule.byDay.includes(istWeekday(date))) continue;
      const startsAt = istToUtc(date, time.hours, time.minutes);
      out.push({
        schedule: s,
        date,
        localTime: time.text,
        startsAt,
        endsAt: new Date(startsAt.getTime() + s.durationMin * 60_000),
      });
    }
  }
  return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
