import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ERROR_CODES, type OtpChallenge } from '@tirth-now/shared-types';
import { type Redis } from 'ioredis';
import { AppException } from '../../../core/http';
import { EMAIL_PROVIDER, type EmailProvider } from '../../../core/providers';
import { REDIS } from '../../../core/redis';
import { safeEqualHex, sha256, sixDigitCode } from './secrets';

const TTL_SECONDS = 300;
const MAX_ATTEMPTS = 5;
const key = (challengeId: string) => `auth:otp:${challengeId}`;

interface StoredChallenge {
  userId: string;
  codeHash: string;
  attempts: number;
}

function parseStored(raw: string): StoredChallenge | null {
  const v: unknown = JSON.parse(raw);
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  return typeof o.userId === 'string' &&
    typeof o.codeHash === 'string' &&
    typeof o.attempts === 'number'
    ? { userId: o.userId, codeHash: o.codeHash, attempts: o.attempts }
    : null;
}

/** Second factor for portal logins. Phase 1 delivers by email; SMS arrives with the notifications module. */
@Injectable()
export class OtpService {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
  ) {}

  async createChallenge(userId: string, emailAddress: string): Promise<OtpChallenge> {
    const challengeId = randomUUID();
    const code = sixDigitCode();
    const stored: StoredChallenge = { userId, codeHash: sha256(code), attempts: 0 };
    await this.redis.set(key(challengeId), JSON.stringify(stored), 'EX', TTL_SECONDS);
    await this.email.send({
      to: emailAddress,
      tag: 'portal_otp',
      subject: 'Your Tirth Now sign-in code',
      text: `Your Tirth Now sign-in code is ${code}. It expires in 5 minutes. If you did not try to sign in, change your password.`,
    });
    return {
      otpRequired: true,
      challengeId,
      channel: 'email',
      expiresAt: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
    };
  }

  /** Returns the user id on success; the challenge is single-use and locks after 5 bad codes. */
  async verify(challengeId: string, code: string): Promise<string> {
    const k = key(challengeId);
    const raw = await this.redis.get(k);
    const stored = raw ? parseStored(raw) : null;
    if (!stored)
      throw AppException.unauthorized(ERROR_CODES.AUTH_OTP_EXPIRED, 'Code expired, sign in again');

    if (!safeEqualHex(stored.codeHash, sha256(code))) {
      const attempts = stored.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) await this.redis.del(k);
      else await this.redis.set(k, JSON.stringify({ ...stored, attempts }), 'KEEPTTL');
      throw AppException.unauthorized(ERROR_CODES.AUTH_OTP_INVALID, 'Incorrect code');
    }
    // GETDEL-style single use: only the request that deletes the key wins.
    if ((await this.redis.del(k)) !== 1) {
      throw AppException.unauthorized(ERROR_CODES.AUTH_OTP_EXPIRED, 'Code expired, sign in again');
    }
    return stored.userId;
  }
}
