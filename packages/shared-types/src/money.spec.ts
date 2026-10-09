import { applyBasisPoints, formatPaise, parseRupees, rupeesToPaise } from './money';

describe('money', () => {
  it('converts rupees to paise', () => {
    expect(rupeesToPaise(1499)).toBe(149_900);
    expect(() => rupeesToPaise(1.5)).toThrow(RangeError);
  });

  it('parses rupee strings without float math', () => {
    expect(parseRupees('₹1,499.50')).toBe(149_950);
    expect(parseRupees('0.1')).toBe(10);
    expect(parseRupees('12')).toBe(1200);
    expect(() => parseRupees('1.234')).toThrow(RangeError);
    expect(() => parseRupees('abc')).toThrow(RangeError);
  });

  it('formats paise in en-IN grouping', () => {
    expect(formatPaise(149_950)).toBe('₹1,499.50');
    expect(formatPaise(12_345_600)).toBe('₹1,23,456');
    expect(formatPaise(-5)).toBe('-₹0.05');
    expect(formatPaise(100, { showZeroPaise: true })).toBe('₹1.00');
  });

  it('applies basis points with banker rounding', () => {
    expect(applyBasisPoints(100_000, 1000)).toBe(10_000); // 10%
    expect(applyBasisPoints(5, 1000)).toBe(0); // 0.5 → 0 (even)
    expect(applyBasisPoints(15, 1000)).toBe(2); // 1.5 → 2 (even)
    expect(applyBasisPoints(25, 1000)).toBe(2); // 2.5 → 2 (even)
    expect(applyBasisPoints(-15, 1000)).toBe(-2);
    expect(applyBasisPoints(1999, 1250)).toBe(250); // 249.875 → 250
  });
});
