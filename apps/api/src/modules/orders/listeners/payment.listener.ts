import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { type Queue } from 'bullmq';
import { QUEUES } from '../../../core/queue';
import {
  PAYMENT_EVENTS,
  type PaymentCapturedEvent,
  type RefundProcessedEvent,
} from '../../payments';
import { APPLY_PAYMENT_JOB } from '../processors/orders.processor';
import { OrdersService } from '../services/orders.service';

/** Reacts to the payments module. Failures are retried on the orders queue, never dropped. */
@Injectable()
export class PaymentListener {
  private readonly logger = new Logger(PaymentListener.name);

  constructor(
    private readonly orders: OrdersService,
    @InjectQueue(QUEUES.orders) private readonly queue: Queue,
  ) {}

  @OnEvent(PAYMENT_EVENTS.captured, { async: true, promisify: true })
  async onCaptured(e: PaymentCapturedEvent): Promise<void> {
    try {
      await this.orders.applyCapturedPayment(e.orderId, e.paymentId);
    } catch (err) {
      this.logger.error(
        { err, orderId: e.orderId },
        'applying captured payment failed; retrying in background',
      );
      await this.queue.add(APPLY_PAYMENT_JOB, e, {
        jobId: `apply-${e.paymentId}`,
        attempts: 10,
        backoff: { type: 'exponential', delay: 3_000 },
      });
    }
  }

  @OnEvent(PAYMENT_EVENTS.refundProcessed, { async: true, promisify: true })
  async onRefundProcessed(e: RefundProcessedEvent): Promise<void> {
    if (!e.fullyRefunded) return;
    try {
      await this.orders.markRefunded(e.orderId);
    } catch (err) {
      this.logger.error({ err, orderId: e.orderId }, 'marking order refunded failed');
    }
  }
}
