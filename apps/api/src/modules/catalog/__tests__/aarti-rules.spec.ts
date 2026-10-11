import { dbDate, dbTime } from '../../../core/time';
import { expandSchedules, parseRecurrence, seasonOf } from '../services/aarti-rules';

const schedule = (
  over: Partial<{
    id: string;
    localTime: Date;
    recurrence: string;
    season: string;
    validFrom: Date | null;
    validTo: Date | null;
  }> = {},
) => ({
  id: 's1',
  templeId: 't1',
  localTime: dbTime('05:00'),
  durationMin: 20,
  recurrence: 'FREQ=DAILY',
  validFrom: null,
  validTo: null,
  season: 'all',
  ...over,
});

describe('parseRecurrence', () => {
  it('accepts daily and weekly rules', () => {
    expect(parseRecurrence('FREQ=DAILY')).toEqual({ freq: 'DAILY', byDay: null });
    expect(parseRecurrence('FREQ=WEEKLY;BYDAY=MO,TH')).toEqual({ freq: 'WEEKLY', byDay: [1, 4] });
  });

  it.each(['FREQ=MONTHLY', 'FREQ=WEEKLY', 'FREQ=WEEKLY;BYDAY=XX', 'FREQ=DAILY;COUNT=3', ''])(
    'rejects %p',
    (rule) => {
      expect(() => parseRecurrence(rule)).toThrow(RangeError);
    },
  );
});

describe('expandSchedules', () => {
  it('produces one UTC occurrence per IST day', () => {
    const out = expandSchedules([schedule()], '2026-10-11', '2026-10-12');
    expect(out.map((o) => o.startsAt.toISOString())).toEqual([
      '2026-10-10T23:30:00.000Z',
      '2026-10-11T23:30:00.000Z',
    ]);
    expect(out[0]?.endsAt.toISOString()).toBe('2026-10-10T23:50:00.000Z');
    expect(out[0]?.localTime).toBe('05:00');
  });

  it('respects weekly rules, validity windows and seasons', () => {
    const weekly = schedule({ id: 'w', recurrence: 'FREQ=WEEKLY;BYDAY=SU' });
    const windowed = schedule({
      id: 'v',
      validFrom: dbDate('2026-10-12'),
      validTo: dbDate('2026-10-12'),
    });
    const summer = schedule({ id: 'su', season: 'summer' });
    const winter = schedule({ id: 'wi', season: 'winter' });
    const out = expandSchedules([weekly, windowed, summer, winter], '2026-10-11', '2026-10-13');
    const byId = (id: string) => out.filter((o) => o.schedule.id === id).map((o) => o.date);
    expect(byId('w')).toEqual(['2026-10-11']);
    expect(byId('v')).toEqual(['2026-10-12']);
    expect(byId('su')).toHaveLength(3);
    expect(byId('wi')).toHaveLength(0);
  });

  it('sorts across temples by start time', () => {
    const late = schedule({ id: 'late', localTime: dbTime('19:00') });
    const early = schedule({ id: 'early', localTime: dbTime('04:30') });
    expect(
      expandSchedules([late, early], '2026-10-11', '2026-10-11').map((o) => o.schedule.id),
    ).toEqual(['early', 'late']);
  });

  it('classifies seasons by month', () => {
    expect(seasonOf('2026-05-01')).toBe('summer');
    expect(seasonOf('2026-12-01')).toBe('winter');
  });
});
