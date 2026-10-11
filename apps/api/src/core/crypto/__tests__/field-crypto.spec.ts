import { randomBytes } from 'node:crypto';
import { decryptField, encryptField } from '../field-crypto';

describe('field crypto', () => {
  const key = randomBytes(32);

  it('round-trips and never repeats ciphertext', () => {
    const a = encryptField('123456789012', key);
    const b = encryptField('123456789012', key);
    expect(a).not.toBe(b);
    expect(a.startsWith('v1:')).toBe(true);
    expect(decryptField(a, key)).toBe('123456789012');
  });

  it('detects tampering and wrong keys', () => {
    const enc = encryptField('secret', key);
    const parts = enc.split(':');
    parts[3] = Buffer.from('other').toString('base64');
    expect(() => decryptField(parts.join(':'), key)).toThrow();
    expect(() => decryptField(enc, randomBytes(32))).toThrow();
    expect(() => decryptField('v0:a:b:c', key)).toThrow(/Unsupported/);
  });
});
