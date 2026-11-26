import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { CacheService } from '../../../core/cache';
import { AppException } from '../../../core/http';
import { MaintenanceRegistry } from '../../../core/maintenance';
import { PrismaService } from '../../../core/prisma';
import { type AartiInstanceResponse, CatalogFacade } from '../../catalog';
import { IdentityFacade } from '../../identity';
import { NotificationsService } from './notifications.service';

/** Look back this far each run, so a slow or missed minute still announces the aarti once. */
const WINDOW_MS = 3 * 60_000;

/**
 * "Aarti has started" pushes. Recipients: users who follow the temple's aarti alerts, plus
 * users holding a reminder for that aarti. Sent once per occurrence (claimed in Redis), so
 * several worker replicas never double-send. Works with the app closed (FCM push).
 */
@Injectable()
export class AartiLiveService implements OnModuleInit {
  private readonly logger = new Logger(AartiLiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogFacade,
    private readonly identity: IdentityFacade,
    private readonly notifications: NotificationsService,
    private readonly cache: CacheService,
    private readonly maintenance: MaintenanceRegistry,
  ) {}

  onModuleInit(): void {
    this.maintenance.registerRecurring('aarti-live-push', 60_000, () => this.sendStarted());
  }

  async follow(userId: string, templeId: string): Promise<{ templeIds: string[] }> {
    if (!(await this.catalog.templeExists(templeId))) {
      throw AppException.notFound('Temple not found');
    }
    await this.prisma.templeAartiAlert.upsert({
      where: { userId_templeId: { userId, templeId } },
      create: { userId, templeId },
      update: {},
    });
    return this.list(userId);
  }

  async unfollow(userId: string, templeId: string): Promise<{ templeIds: string[] }> {
    await this.prisma.templeAartiAlert.deleteMany({ where: { userId, templeId } });
    return this.list(userId);
  }

  async list(userId: string): Promise<{ templeIds: string[] }> {
    const rows = await this.prisma.templeAartiAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { templeId: true },
    });
    return { templeIds: rows.map((r) => r.templeId) };
  }

  /** Scheduler: one push per aarti occurrence that began in the last few minutes. */
  async sendStarted(now = new Date()): Promise<number> {
    const started = (
      await this.catalog.upcomingAarti(undefined, 500, 'en', new Date(now.getTime() - WINDOW_MS))
    ).filter((a) => {
      const start = Date.parse(a.startsAt);
      return start <= now.getTime() && start > now.getTime() - WINDOW_MS;
    });
    let sent = 0;
    for (const a of started) {
      const users = await this.recipients(a);
      if (users.length === 0) continue;
      if (
        !(await this.cache.setIfAbsent(`push:aarti-live:${a.scheduleId}:${a.startsAt}`, 6 * 3_600))
      )
        continue;
      await this.notify(a, users);
      sent += users.length;
    }
    if (sent > 0) this.logger.log({ sent }, 'aarti started pushes sent');
    return sent;
  }

  private async recipients(a: AartiInstanceResponse): Promise<string[]> {
    const [followers, reminders] = await Promise.all([
      this.prisma.templeAartiAlert.findMany({
        where: { templeId: a.templeId },
        select: { userId: true },
      }),
      this.prisma.aartiReminder.findMany({
        where: { aartiScheduleId: a.scheduleId },
        select: { userId: true },
      }),
    ]);
    return [...new Set([...followers, ...reminders].map((r) => r.userId))];
  }

  /** Hindi readers get the Hindi aarti and temple names. */
  private async notify(a: AartiInstanceResponse, userIds: string[]): Promise<void> {
    const contacts = await this.identity.getContacts(userIds);
    const hindi = new Set(contacts.filter((c) => c.preferredLang === 'hi').map((c) => c.id));
    const groups: [string[], AartiInstanceResponse][] = [
      [userIds.filter((id) => !hindi.has(id)), a],
    ];
    if (hindi.size > 0) {
      const [hi] = await this.catalog.aartiOccurrences([a.scheduleId], a.date, a.date, 'hi');
      groups.push([[...hindi], hi ?? a]);
    }
    for (const [ids, local] of groups) {
      if (ids.length === 0) continue;
      await this.notifications.notifyUsers({
        userIds: ids,
        key: 'aarti_live',
        vars: { aarti: local.name, temple: local.templeName ?? '' },
        payload: {
          type: 'aarti',
          templeId: a.templeId,
          scheduleId: a.scheduleId,
          startsAt: a.startsAt,
        },
      });
    }
  }
}
