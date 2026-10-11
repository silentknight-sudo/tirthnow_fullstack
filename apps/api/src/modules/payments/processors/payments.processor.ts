import { Processor } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { QUEUES, RoleAwareProcessor } from '../../../core/queue';
import { CREATE_REFUND_JOB, PaymentsService } from '../services/payments.service';

@Processor(QUEUES.payments, { autorun: false })
export class PaymentsProcessor extends RoleAwareProcessor {
  constructor(private readonly payments: PaymentsService) {
    super();
  }

  async process(job: Job<{ refundId: string }>): Promise<string> {
    if (job.name === CREATE_REFUND_JOB) return this.payments.executeRefund(job.data.refundId);
    return 'ignored';
  }
}
