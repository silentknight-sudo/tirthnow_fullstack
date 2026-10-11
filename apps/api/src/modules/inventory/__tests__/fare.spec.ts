import { isNight, meteredFare } from '../services/fare';

const rule = {
  baseFarePaise: 100_00,
  perKmPaise: 14_00,
  perMinPaise: 1_00,
  minFarePaise: 250_00,
  nightSurchargePct: 25,
};
const noonIst = new Date('2026-10-11T06:30:00Z');
const elevenPmIst = new Date('2026-10-11T17:30:00Z');

describe('meteredFare', () => {
  it('adds base, distance and time in paise', () => {
    // 12.5 km, 30 min: 100 + 175 + 30 = ₹305
    expect(meteredFare(rule, 12_500, 1800, noonIst)).toEqual({ farePaise: 305_00, night: false });
  });

  it('applies the minimum fare', () => {
    expect(meteredFare(rule, 1_000, 120, noonIst).farePaise).toBe(250_00);
  });

  it('applies the night surcharge after the minimum', () => {
    expect(meteredFare(rule, 1_000, 120, elevenPmIst)).toEqual({ farePaise: 312_50, night: true });
  });

  it('never produces fractional paise', () => {
    const fare = meteredFare({ ...rule, perKmPaise: 1_333 }, 7_777, 777, noonIst).farePaise;
    expect(Number.isInteger(fare)).toBe(true);
  });
});

describe('isNight', () => {
  it.each([
    ['2026-10-11T16:29:00Z', false], // 21:59 IST
    ['2026-10-11T16:30:00Z', true], // 22:00 IST
    ['2026-10-11T00:29:00Z', true], // 05:59 IST
    ['2026-10-11T00:30:00Z', false], // 06:00 IST
  ])('%s → %s', (iso, expected) => {
    expect(isNight(new Date(iso))).toBe(expected);
  });
});
