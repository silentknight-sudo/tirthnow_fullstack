import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

// OWASP-recommended argon2id baseline (19 MiB, t=2, p=1).
const OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

@Injectable()
export class PasswordService {
  private dummyHash: Promise<string> | undefined;

  hash(password: string): Promise<string> {
    return argon2.hash(password, OPTIONS);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /** Spend the same time as a real verify so unknown emails are not distinguishable by latency. */
  async verifyAgainstDummy(password: string): Promise<false> {
    this.dummyHash ??= argon2.hash('tirth-now-dummy-password', OPTIONS);
    await this.verify(await this.dummyHash, password);
    return false;
  }
}
