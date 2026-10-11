import { type INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { type Server, type ServerOptions } from 'socket.io';
import { type AppConfig } from '../../core/config';

/** Redis pub/sub channel prefix; includes the DB index so test and dev stacks never cross-talk. */
export function realtimeKey(redisUrl: string): string {
  const db = new URL(redisUrl).pathname.slice(1) || '0';
  return `tn-rt:${db}`;
}

/** Socket.IO with the Redis adapter, so every API replica (and the worker's emitter) reaches every client. */
export class RedisIoAdapter extends IoAdapter {
  private readonly pub: Redis;
  private readonly sub: Redis;

  constructor(
    app: INestApplicationContext,
    private readonly config: AppConfig,
  ) {
    super(app);
    this.pub = new Redis(config.redisUrl, { lazyConnect: false, maxRetriesPerRequest: null });
    this.sub = this.pub.duplicate();
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: this.config.corsOrigins, credentials: true },
      // Mobile networks drop often; keep pings frequent enough to detect it.
      pingInterval: 20_000,
      pingTimeout: 20_000,
    }) as Server;
    server.adapter(createAdapter(this.pub, this.sub, { key: realtimeKey(this.config.redisUrl) }));
    return server;
  }

  override async dispose(): Promise<void> {
    await super.dispose();
    await Promise.allSettled([this.pub.quit(), this.sub.quit()]);
  }
}
