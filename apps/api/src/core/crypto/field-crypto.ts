import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';

/**
 * AES-256-GCM for sensitive columns (bank account numbers). Output format:
 * `v1:<iv b64>:<tag b64>:<ciphertext b64>`; the version prefix allows key rotation later.
 */
export function encryptField(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [
    VERSION,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    ct.toString('base64'),
  ].join(':');
}

export function decryptField(payload: string, key: Buffer): string {
  const [version, iv, tag, ct] = payload.split(':');
  if (version !== VERSION || !iv || !tag || !ct)
    throw new Error('Unsupported encrypted field format');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString(
    'utf8',
  );
}
