/** Money is always an integer number of paise (1 INR = 100 paise). Never use floats. */
export type Paise = number;

export function assertPaise(value: number): asserts value is Paise {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Money must be an integer number of paise, got ${String(value)}`);
  }
}

/** Convert whole rupees (integer) to paise. */
export function rupeesToPaise(rupees: number): Paise {
  if (!Number.isSafeInteger(rupees)) {
    throw new RangeError('rupeesToPaise expects an integer; parse decimal input with parseRupees');
  }
  return rupees * 100;
}

/** Parse a user-entered rupee string like "1,499.50" into paise without floating-point math. */
export function parseRupees(input: string): Paise {
  const cleaned = input.replace(/[₹,\s]/g, '');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match?.[1]) throw new RangeError(`Invalid rupee amount: ${input}`);
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));
  const paise = whole * 100 + fraction;
  assertPaise(paise);
  return paise;
}

/** Format paise for display in en-IN, e.g. 149950 → "₹1,499.50". */
export function formatPaise(paise: Paise, opts: { showZeroPaise?: boolean } = {}): string {
  assertPaise(paise);
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const whole = Math.trunc(abs / 100);
  const fraction = abs % 100;
  const wholeStr = new Intl.NumberFormat('en-IN').format(whole);
  const showFraction = fraction !== 0 || opts.showZeroPaise === true;
  const body = showFraction ? `${wholeStr}.${String(fraction).padStart(2, '0')}` : wholeStr;
  return `${negative ? '-' : ''}₹${body}`;
}

/** Percentage in basis points (1000 = 10%), rounded half-to-even to whole paise. */
export function applyBasisPoints(amount: Paise, bps: number): Paise {
  assertPaise(amount);
  if (!Number.isSafeInteger(bps)) throw new RangeError('bps must be an integer');
  const numerator = amount * bps;
  const quotient = Math.trunc(numerator / 10_000);
  const remainder = numerator - quotient * 10_000;
  const twice = Math.abs(remainder) * 2;
  if (twice < 10_000) return quotient;
  if (twice > 10_000) return quotient + Math.sign(numerator);
  return quotient % 2 === 0 ? quotient : quotient + Math.sign(numerator);
}
