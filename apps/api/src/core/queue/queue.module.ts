import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { APP_CONFIG, type AppConfig } from '../config';
import { DEFAULT_JOB_OPTIONS, QUEUES } from './queues';
import { bullConnection } from './redis-connection';

const registered = Object.values(QUEUES).map((name) => ({ name }));

/** Registers the BullMQ connection and every queue once; inject with @InjectQueue(QUEUES.x). */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        connection: bullConnection(config.redisUrl),
        prefix: 'tn',
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
    }),
    BullModule.registerQueue(...registered),
  ],
  exports: [BullModule],
})
export class QueueModule {}
