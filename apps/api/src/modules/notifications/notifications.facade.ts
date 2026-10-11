import { Injectable } from '@nestjs/common';
import { type BroadcastJob, BroadcastService } from './services/broadcast.service';
import { NotificationSender, type SendOutcome } from './services/notification-sender.service';
import {
  type NotifyPhonesInput,
  type NotifyUsersInput,
  NotificationsService,
} from './services/notifications.service';

/** Public surface of the notifications module. */
@Injectable()
export class NotificationsFacade {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly sender: NotificationSender,
    private readonly broadcasts: BroadcastService,
  ) {}

  /** Queue a push + in-app broadcast to every active user (optionally one home city). */
  broadcast(job: Omit<BroadcastJob, 'afterId'>): Promise<void> {
    return this.broadcasts.start(job);
  }

  notifyUsers(input: NotifyUsersInput): Promise<string[]> {
    return this.notifications.notifyUsers(input);
  }

  notifyPhones(input: NotifyPhonesInput): Promise<string[]> {
    return this.notifications.notifyPhones(input);
  }

  /**
   * Deliver now (urgent paths like SOS); anything that fails transiently is queued for retry.
   * Returns each row's outcome.
   */
  async deliverNow(ids: string[]): Promise<Record<string, SendOutcome | 'queued'>> {
    const out: Record<string, SendOutcome | 'queued'> = {};
    const results = await Promise.allSettled(ids.map((id) => this.sender.send(id)));
    const retry: string[] = [];
    results.forEach((r, i) => {
      const id = ids[i] ?? '';
      if (r.status === 'fulfilled') out[id] = r.value;
      else {
        out[id] = 'queued';
        retry.push(id);
      }
    });
    await this.notifications.enqueue(retry, 'high');
    return out;
  }
}
