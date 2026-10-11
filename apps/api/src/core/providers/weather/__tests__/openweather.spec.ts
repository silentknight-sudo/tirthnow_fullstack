import { toDaily } from '../openweather.adapter';

describe('OpenWeather forecast aggregation', () => {
  it('groups 3-hour slots by IST date with min/max, peak rain chance and dominant condition', () => {
    const ts = (iso: string) => Date.parse(iso) / 1000;
    const slot = (iso: string, min: number, max: number, main: string, pop = 0) => ({
      dt: ts(iso),
      main: { temp_min: min, temp_max: max },
      weather: [{ main, description: '' }],
      pop,
    });
    const days = toDaily({
      list: [
        slot('2026-07-10T15:00:00Z', 29, 30, 'Clouds'), // 20:30 IST on the 10th
        slot('2026-07-10T19:00:00Z', 27.04, 28, 'Rain', 0.8), // 00:30 IST on the 11th
        slot('2026-07-11T03:00:00Z', 28, 33.36, 'Rain', 0.4),
        slot('2026-07-11T09:00:00Z', 30, 34, 'Clouds', 0.1),
      ],
    });
    expect(days).toEqual([
      { date: '2026-07-10', minC: 29, maxC: 30, condition: 'clouds', rainChancePct: 0 },
      { date: '2026-07-11', minC: 27, maxC: 34, condition: 'rain', rainChancePct: 80 },
    ]);
  });
});
