import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { type Redis } from 'ioredis';
import { type AuthPrincipal } from '../../../core/auth';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { REDIS } from '../../../core/redis';
import { dbDate, istDate } from '../../../core/time';

export interface QuotaStatus {
  limit: number;
  used: number;
  remaining: number;
  resetsOn: string;
}

/** Per-user daily AI requests (IST day) in Redis; token usage persisted to ai_usage for reporting. */
@Injectable()
export class QuotaService {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
  ) {}

  private key(userId: string, day: string): string {
    return `ai-quota:${userId}:${day}`;
  }

  limitFor(user: AuthPrincipal): number {
    return user.isGuest ? this.config.ai.quotaGuest : this.config.ai.quotaUser;
  }

  async status(user: AuthPrincipal): Promise<QuotaStatus> {
    const day = istDate(new Date());
    const used = Number((await this.redis.get(this.key(user.userId, day))) ?? 0);
    const limit = this.limitFor(user);
    return { limit, used, remaining: Math.max(0, limit - used), resetsOn: day };
  }

  /** Count one AI request or refuse with 429 AI_QUOTA_EXCEEDED. */
  async consume(user: AuthPrincipal): Promise<void> {
    const day = istDate(new Date());
    const key = this.key(user.userId, day);
    const used = await this.redis.incr(key);
    if (used === 1) await this.redis.expire(key, 2 * 86_400);
    if (used > this.limitFor(user)) {
      await this.redis.decr(key);
      throw new AppException(
        ERROR_CODES.AI_QUOTA_EXCEEDED,
        HttpStatus.TOO_MANY_REQUESTS,
        'Daily AI guide limit reached; it resets at midnight IST',
      );
    }
  }

  async record(
    userId: string,
    usage: { inputTokens: number; outputTokens: number },
  ): Promise<void> {
    const date = dbDate(istDate(new Date()));
    await this.prisma.aiUsage.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        requests: 1,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
      update: {
        requests: { increment: 1 },
        inputTokens: { increment: usage.inputTokens },
        outputTokens: { increment: usage.outputTokens },
      },
    });
  }
}
