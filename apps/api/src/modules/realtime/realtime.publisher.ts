import { Inject, Injectable } from '@nestjs/common';
import { Emitter } from '@socket.io/redis-emitter';
import { type Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../../core/config';
import { REDIS } from '../../core/redis';
import { realtimeKey } from './redis-io.adapter';

export const RT_NAMESPACE = '/rt';

/**
 * Emits to Socket.IO rooms through Redis, so it works the same from API replicas and the
 * worker process (which runs no socket server).
 */
@Injectable()
export class RealtimePublisher {
  private readonly emitter: Emitter;

  constructor(@Inject(REDIS) redis: Redis, @Inject(APP_CONFIG) config: AppConfig) {
    this.emitter = new Emitter(redis, { key: realtimeKey(config.redisUrl) }).of(RT_NAMESPACE);
  }

  toRoom(room: string | string[], event: string, payload: object): void {
    this.emitter.to(room).emit(event, payload);
  }
}
