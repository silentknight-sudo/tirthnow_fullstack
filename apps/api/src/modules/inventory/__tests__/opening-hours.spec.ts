import { isOpenAt } from '../services/opening-hours';

const ist = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+05:30`);

describe('isOpenAt', () => {
  const hours = { daily: [['07:00', '22:30']], sun: [['08:00', '14:00']] };

  it('uses daily hours on weekdays', () => {
    expect(isOpenAt(hours, ist('2026-10-12', '06:59'))).toBe(false); // Monday
    expect(isOpenAt(hours, ist('2026-10-12', '07:00'))).toBe(true);
    expect(isOpenAt(hours, ist('2026-10-12', '22:30'))).toBe(false);
  });

  it('lets a weekday key override daily', () => {
    expect(isOpenAt(hours, ist('2026-10-11', '15:00'))).toBe(false); // Sunday
    expect(isOpenAt(hours, ist('2026-10-11', '09:00'))).toBe(true);
  });

  it('handles ranges past midnight and missing data', () => {
    expect(isOpenAt({ daily: [['18:00', '02:00']] }, ist('2026-10-12', '01:30'))).toBe(true);
    expect(isOpenAt({ daily: [['18:00', '02:00']] }, ist('2026-10-12', '03:00'))).toBe(false);
    expect(isOpenAt({}, ist('2026-10-12', '03:00'))).toBe(true);
    expect(isOpenAt(null, ist('2026-10-12', '03:00'))).toBe(true);
  });
});
