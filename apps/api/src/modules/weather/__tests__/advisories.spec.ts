import { advisoriesFor } from '../services/advisories';

const day = (date: string, minC: number, maxC: number, condition = 'clear', rainChancePct = 0) => ({
  date,
  minC,
  maxC,
  condition,
  rainChancePct,
});

describe('advisoriesFor', () => {
  it('flags heat, cold, rain, storms and fog in the first three days only', () => {
    const out = advisoriesFor(
      [
        day('2026-05-20', 28, 43),
        day('2026-05-21', 27, 38, 'rain', 70),
        day('2026-05-22', 25, 33, 'thunderstorm', 80),
        day('2026-05-23', 5, 45, 'fog'),
      ],
      'en',
    );
    expect(out.map((a) => [a.date, a.code, a.severity])).toEqual([
      ['2026-05-20', 'heat', 'warning'],
      ['2026-05-21', 'heat', 'info'],
      ['2026-05-21', 'rain', 'info'],
      ['2026-05-22', 'storm', 'warning'],
    ]);
  });

  it('localizes messages', () => {
    const [a] = advisoriesFor([day('2026-01-05', 4, 18, 'fog')], 'hi');
    expect(a?.message).toContain('शॉल');
  });
});
