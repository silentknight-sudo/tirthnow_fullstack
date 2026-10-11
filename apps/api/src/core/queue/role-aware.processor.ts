import { Inject, type OnApplicationBootstrap } from '@nestjs/common';
import { WorkerHost } from '@nestjs/bullmq';
import { APP_CONFIG, type AppConfig } from '../config';

/**
 * Base for every BullMQ processor. Declare processors with `@Processor(QUEUE, { autorun: false })`;
 * the worker starts only when PROCESS_ROLE is `worker` or `all` (ADR-0005), so HTTP-only
 * replicas never consume jobs.
 */
export abstract class RoleAwareProcessor extends WorkerHost implements OnApplicationBootstrap {
  @Inject(APP_CONFIG) protected readonly appConfig!: AppConfig;

  onApplicationBootstrap(): void {
    if (this.appConfig.processRole !== 'api' && !this.worker.isRunning()) {
      void this.worker.run();
    }
  }
}

/** Whether repeatable schedules should be registered by this process. */
export function runsWorkers(config: AppConfig): boolean {
  return config.processRole !== 'api';
}
