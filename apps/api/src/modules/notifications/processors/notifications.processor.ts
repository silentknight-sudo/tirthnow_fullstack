import { Logger } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { QUEUES, RoleAwareProcessor } from '../../../core/queue';
import { NotificationSender, type SendOutcome } from '../services/notification-sender.service';
import { SEND_JOB } from '../services/notifications.service';

/** notifications queue: one job per outbound notification row (5 attempts, exponential backoff). */
@Processor(QUEUES.notifications, { autorun: false, concurrency: 10 })
export class NotificationsProcessor extends RoleAwareProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly sender: NotificationSender) {
    super();
  }

  async process(job: Job<{ notificationId: string }>): Promise<SendOutcome | 'ignored'> {
    if (job.name !== SEND_JOB) {
      this.logger.warn({ job: job.name }, 'unknown notifications job');
      return 'ignored';
    }
    const final = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    return this.sender.send(job.data.notificationId, final);
  }
}
