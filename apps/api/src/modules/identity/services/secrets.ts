import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** 256-bit URL-safe opaque token. */
export function newOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function sixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
