import { Controller, Get, HttpStatus, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { type Redis } from 'ioredis';
import { Public } from '../auth';
import { AppException } from '../http';
import { PrismaService } from '../prisma';
import { REDIS } from '../redis';
import { ERROR_CODES } from '@tirth-now/shared-types';

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Liveness: the process is up. */
  @Get('healthz')
  @ApiOkResponse({ description: 'Process is alive' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness: dependencies reachable. */
  @Get('readyz')
  @ApiOkResponse({ description: 'Postgres and Redis reachable' })
  async ready(): Promise<{ status: 'ok'; checks: Record<string, 'up'> }> {
    const [db, redis] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.ping(),
    ]);
    const checks = { postgres: db.status === 'fulfilled', redis: redis.status === 'fulfilled' };
    if (!checks.postgres || !checks.redis) {
      throw new AppException(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        'Dependencies unavailable',
        { postgres: checks.postgres ? 'up' : 'down', redis: checks.redis ? 'up' : 'down' },
      );
    }
    return { status: 'ok', checks: { postgres: 'up', redis: 'up' } };
  }
}
