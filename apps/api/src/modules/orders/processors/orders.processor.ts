import { Inject, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { type Job, type Queue } from 'bullmq';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { QUEUES, RoleAwareProcessor, runsWorkers } from '../../../core/queue';
import { OrdersService } from '../services/orders.service';

export const EXPIRE_HOLDS_JOB = 'expire-holds';
export const AUTO_COMPLETE_JOB = 'auto-complete';
export const APPLY_PAYMENT_JOB = 'apply-payment';

@Processor(QUEUES.orders, { autorun: false })
export class OrdersProcessor extends RoleAwareProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly orders: OrdersService,
    @InjectQueue(QUEUES.orders) private readonly queue: Queue,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    super();
  }

  override onApplicationBootstrap(): void {
    super.onApplicationBootstrap();
    if (!runsWorkers(this.config)) return;
    void this.queue.upsertJobScheduler(
      'expire-holds',
      { every: 60_000 },
      { name: EXPIRE_HOLDS_JOB },
    );
    void this.queue.upsertJobScheduler(
      'auto-complete',
      { every: 15 * 60_000 },
      { name: AUTO_COMPLETE_JOB },
    );
  }

  async process(job: Job<{ orderId?: string; paymentId?: string }>): Promise<unknown> {
    switch (job.name) {
      case EXPIRE_HOLDS_JOB:
        return this.orders.expireHolds();
      case AUTO_COMPLETE_JOB:
        return this.orders.autoComplete();
      case APPLY_PAYMENT_JOB:
        if (job.data.orderId && job.data.paymentId)
          return this.orders.applyCapturedPayment(job.data.orderId, job.data.paymentId);
        return 'invalid';
      default:
        return 'ignored';
    }
  }
}
