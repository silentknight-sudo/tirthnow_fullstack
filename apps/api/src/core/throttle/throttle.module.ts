import { type ExecutionContext, Module, SetMetadata } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { type Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../config';
import { REDIS } from '../redis';

export const AUTH_THROTTLE_KEY = 'throttle:auth';

/** Apply the stricter "auth" bucket (THROTTLE_AUTH_PER_MIN) on top of the default one. */
export const AuthThrottle = () => SetMetadata(AUTH_THROTTLE_KEY, true);

function hasAuthThrottle(ctx: ExecutionContext): boolean {
  const meta = (target: object): unknown => Reflect.getMetadata(AUTH_THROTTLE_KEY, target);
  return meta(ctx.getHandler()) === true || meta(ctx.getClass()) === true;
}

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG, REDIS],
      useFactory: (config: AppConfig, redis: Redis) => ({
        throttlers: [
          { name: 'default', ttl: 60_000, limit: config.throttle.defaultPerMin },
          {
            name: 'auth',
            ttl: 60_000,
            limit: config.throttle.authPerMin,
            skipIf: (ctx) => !hasAuthThrottle(ctx),
          },
        ],
        storage: new ThrottlerStorageRedisService(redis),
        skipIf: (ctx) => ctx.getType() !== 'http',
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class ThrottleModule {}
