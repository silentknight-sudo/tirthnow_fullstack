import { Inject, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { type Job, type Queue } from 'bullmq';
import { APP_CONFIG, type AppConfig } from '../config';
import { PrismaService } from '../prisma';
import { QUEUES, RoleAwareProcessor, runsWorkers } from '../queue';
import { MaintenanceRegistry } from './maintenance.registry';

export const PURGE_JOB = 'purge-expired';
const RECURRING_PREFIX = 'run-';

@Processor(QUEUES.maintenance, { autorun: false })
export class MaintenanceProcessor extends RoleAwareProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  constructor(
    private readonly registry: MaintenanceRegistry,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.maintenance) private readonly queue: Queue,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    super();
    this.registry.register('idempotency-keys', async () => {
      const res = await this.prisma.idempotencyKey.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      return res.count;
    });
  }

  override onApplicationBootstrap(): void {
    super.onApplicationBootstrap();
    if (runsWorkers(this.config)) {
      // 03:15 IST daily.
      void this.queue.upsertJobScheduler(
        'daily-purge',
        { pattern: '45 21 * * *' },
        { name: PURGE_JOB },
      );
      for (const r of this.registry.recurringTasks()) {
        const name = `${RECURRING_PREFIX}${r.name}`;
        void this.queue.upsertJobScheduler(
          name,
          { every: r.everyMs },
          { name, opts: { attempts: 1 } },
        );
      }
    }
  }

  async process(job: Job): Promise<Record<string, number>> {
    if (job.name.startsWith(RECURRING_PREFIX)) {
      const name = job.name.slice(RECURRING_PREFIX.length);
      return { [name]: await this.registry.runRecurring(name) };
    }
    if (job.name !== PURGE_JOB) return {};
    const results = await this.registry.runAll();
    this.logger.log({ results }, 'maintenance complete');
    return results;
  }
}
