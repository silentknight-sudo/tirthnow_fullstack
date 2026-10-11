import {
  addDays,
  dateRange,
  dbDate,
  dbTime,
  fromDbTime,
  isIsoDate,
  istDate,
  istMinutesOfDay,
  istToUtc,
  istWeekday,
} from '../ist';

describe('IST helpers', () => {
  it('converts IST wall clock to UTC', () => {
    expect(istToUtc('2026-10-11', 5, 0).toISOString()).toBe('2026-10-10T23:30:00.000Z');
    expect(istToUtc('2026-10-11', 19, 30).toISOString()).toBe('2026-10-11T14:00:00.000Z');
  });

  it('gives the IST calendar date and minute of day', () => {
    const lateUtc = new Date('2026-10-10T20:00:00Z'); // 01:30 IST next day
    expect(istDate(lateUtc)).toBe('2026-10-11');
    expect(istMinutesOfDay(lateUtc)).toBe(90);
  });

  it('handles weekdays, date arithmetic and ranges', () => {
    expect(istWeekday('2026-10-11')).toBe(0); // Sunday
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(dateRange('2026-02-27', '2026-03-01')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ]);
  });

  it('round-trips Prisma date and time columns', () => {
    expect(dbDate('2026-10-11').toISOString()).toBe('2026-10-11T00:00:00.000Z');
    expect(fromDbTime(dbTime('07:45'))).toEqual({ hours: 7, minutes: 45, text: '07:45' });
    expect(() => dbTime('24:00')).toThrow(RangeError);
  });

  it('validates ISO dates strictly', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-1-01')).toBe(false);
  });
});
