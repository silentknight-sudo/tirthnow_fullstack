import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type Queue } from 'bullmq';
import { QUEUES } from '../../../core/queue';
import { IdentityFacade } from '../../identity';
import { NotificationsService } from './notifications.service';

export const BROADCAST_JOB = 'send-broadcast';
const BATCH = 500;

export interface BroadcastJob {
  broadcastId: string;
  title: string;
  body: string;
  /** Emergency alerts ignore marketing preferences and use the SOS channel. */
  emergency: boolean;
  homeCityId: string | null;
  afterId: string | null;
}

/** Push + in-app broadcast to a city segment, in batches on the notifications queue. */
@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    private readonly identity: IdentityFacade,
    private readonly notifications: NotificationsService,
    @InjectQueue(QUEUES.notifications) private readonly queue: Queue,
  ) {}

  async start(job: Omit<BroadcastJob, 'afterId'>): Promise<void> {
    await this.queue.add(BROADCAST_JOB, { ...job, afterId: null } satisfies BroadcastJob, {
      jobId: `broadcast-${job.broadcastId}-start`,
      priority: job.emergency ? 1 : 5,
    });
  }

  /** One batch per job; the next batch is queued until no users remain. */
  async runBatch(job: BroadcastJob): Promise<number> {
    const userIds = await this.identity.activeUserIds({
      ...(job.homeCityId ? { homeCityId: job.homeCityId } : {}),
      limit: BATCH,
      ...(job.afterId ? { afterId: job.afterId } : {}),
    });
    if (userIds.length === 0) return 0;
    await this.notifications.notifyUsers({
      userIds,
      key: job.emergency ? 'emergency_broadcast' : 'broadcast',
      vars: { title: job.title, body: job.body },
      payload: { type: 'broadcast', broadcastId: job.broadcastId },
    });
    const last = userIds.at(-1);
    if (userIds.length === BATCH && last) {
      await this.queue.add(BROADCAST_JOB, { ...job, afterId: last } satisfies BroadcastJob, {
        jobId: `broadcast-${job.broadcastId}-${last}`,
        priority: job.emergency ? 1 : 5,
      });
    }
    this.logger.log(
      { broadcastId: job.broadcastId, users: userIds.length },
      'broadcast batch queued',
    );
    return userIds.length;
  }
}
