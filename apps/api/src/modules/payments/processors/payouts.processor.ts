import { Inject, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { type Job, type Queue } from 'bullmq';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { QUEUES, RoleAwareProcessor, runsWorkers } from '../../../core/queue';
import {
  EXECUTE_PAYOUT_JOB,
  PayoutsService,
  SCHEDULE_PAYOUTS_JOB,
} from '../services/payouts.service';

@Processor(QUEUES.payouts, { autorun: false })
export class PayoutsProcessor extends RoleAwareProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly payouts: PayoutsService,
    @InjectQueue(QUEUES.payouts) private readonly queue: Queue,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    super();
  }

  override onApplicationBootstrap(): void {
    super.onApplicationBootstrap();
    // 02:00 IST daily.
    if (runsWorkers(this.config))
      void this.queue.upsertJobScheduler(
        'daily-payouts',
        { pattern: '30 20 * * *' },
        { name: SCHEDULE_PAYOUTS_JOB },
      );
  }

  async process(job: Job<{ payoutId?: string }>): Promise<unknown> {
    if (job.name === SCHEDULE_PAYOUTS_JOB) return this.payouts.scheduleAll();
    if (job.name === EXECUTE_PAYOUT_JOB && job.data.payoutId)
      return this.payouts.execute(job.data.payoutId);
    return 'ignored';
  }
}
