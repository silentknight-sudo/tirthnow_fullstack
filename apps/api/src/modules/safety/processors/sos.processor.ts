import { Logger } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { QUEUES, RoleAwareProcessor } from '../../../core/queue';
import { DISPATCH_SOS_JOB, NOTIFY_SAFE_JOB } from '../services/safety.service';
import { SosDispatchService } from '../services/sos-dispatch.service';

/** sos queue: priority 1, 5 attempts with exponential backoff (ARCHITECTURE.md §8). */
@Processor(QUEUES.sos, { autorun: false, concurrency: 20 })
export class SosProcessor extends RoleAwareProcessor {
  private readonly logger = new Logger(SosProcessor.name);

  constructor(private readonly dispatcher: SosDispatchService) {
    super();
  }

  async process(job: Job<{ sosId: string }>): Promise<string> {
    switch (job.name) {
      case DISPATCH_SOS_JOB:
        return this.dispatcher.dispatch(job.data.sosId);
      case NOTIFY_SAFE_JOB:
        return this.dispatcher.notifySafe(job.data.sosId);
      default:
        this.logger.warn({ job: job.name }, 'unknown sos job');
        return 'ignored';
    }
  }
}
