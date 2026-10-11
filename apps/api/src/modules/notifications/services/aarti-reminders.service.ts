import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { type Lang } from '@tirth-now/shared-types';
import { AppException } from '../../../core/http';
import { MaintenanceRegistry } from '../../../core/maintenance';
import { PrismaService } from '../../../core/prisma';
import { addDays, istDate } from '../../../core/time';
import { CatalogFacade } from '../../catalog';
import { IdentityFacade } from '../../identity';
import { type AartiReminderResponse, type CreateAartiReminderDto } from '../dto/notifications.dto';
import { NotificationsService } from './notifications.service';

const MAX_REMINDERS = 30;
/** Fire when the reminder time falls in the last few minutes (scheduler runs every minute). */
const LATE_GRACE_MS = 5 * 60_000;

@Injectable()
export class AartiRemindersService implements OnModuleInit {
  private readonly logger = new Logger(AartiRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogFacade,
    private readonly identity: IdentityFacade,
    private readonly notifications: NotificationsService,
    private readonly maintenance: MaintenanceRegistry,
  ) {}

  onModuleInit(): void {
    this.maintenance.registerRecurring('aarti-reminders', 60_000, () => this.sendDue());
  }

  async create(
    userId: string,
    dto: CreateAartiReminderDto,
    lang: Lang,
  ): Promise<AartiReminderResponse> {
    const schedule = await this.catalog.aartiSchedule(dto.aartiScheduleId);
    if (!schedule || schedule.temple.deletedAt) throw AppException.notFound('Aarti not found');
    const prefs = await this.identity.notificationPrefs(userId);
    const minutesBefore =
      dto.minutesBefore ??
      (typeof prefs.defaultReminderMinutes === 'number' ? prefs.defaultReminderMinutes : 30);
    const existing = await this.prisma.aartiReminder.findUnique({
      where: { userId_aartiScheduleId: { userId, aartiScheduleId: dto.aartiScheduleId } },
    });
    if (
      !existing &&
      (await this.prisma.aartiReminder.count({ where: { userId } })) >= MAX_REMINDERS
    ) {
      throw AppException.badRequest(`At most ${String(MAX_REMINDERS)} aarti reminders`);
    }
    const row = await this.prisma.aartiReminder.upsert({
      where: { userId_aartiScheduleId: { userId, aartiScheduleId: dto.aartiScheduleId } },
      create: { userId, aartiScheduleId: dto.aartiScheduleId, minutesBefore },
      update: { minutesBefore },
    });
    const [res] = await this.withNext([row], lang);
    if (!res) throw AppException.notFound('Aarti not found');
    return res;
  }

  async list(userId: string, lang: Lang): Promise<AartiReminderResponse[]> {
    const rows = await this.prisma.aartiReminder.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return this.withNext(rows, lang);
  }

  async remove(userId: string, id: string): Promise<void> {
    const res = await this.prisma.aartiReminder.deleteMany({ where: { id, userId } });
    if (res.count === 0) throw AppException.notFound('Reminder not found');
  }

  private async withNext(
    rows: { id: string; aartiScheduleId: string; minutesBefore: number }[],
    lang: Lang,
    now = new Date(),
  ): Promise<AartiReminderResponse[]> {
    const today = istDate(now);
    const occurrences = await this.catalog.aartiOccurrences(
      [...new Set(rows.map((r) => r.aartiScheduleId))],
      today,
      addDays(today, 7),
      lang,
    );
    return rows.flatMap((r) => {
      const mine = occurrences.filter((o) => o.scheduleId === r.aartiScheduleId);
      const first = mine[0];
      if (!first) return [];
      const next = mine.find((o) => new Date(o.startsAt) > now) ?? null;
      return [
        {
          id: r.id,
          aartiScheduleId: r.aartiScheduleId,
          templeId: first.templeId,
          templeName: first.templeName ?? '',
          aartiName: first.name,
          minutesBefore: r.minutesBefore,
          nextAartiAt: next?.startsAt ?? null,
          nextReminderAt: next
            ? new Date(Date.parse(next.startsAt) - r.minutesBefore * 60_000).toISOString()
            : null,
        },
      ];
    });
  }

  /** Scheduler: one push per reminder per occurrence, claimed atomically so replicas never double-send. */
  async sendDue(now = new Date()): Promise<number> {
    const reminders = await this.prisma.aartiReminder.findMany({
      where: { user: { status: 'active' } },
      select: {
        id: true,
        userId: true,
        aartiScheduleId: true,
        minutesBefore: true,
        lastOccurrenceAt: true,
      },
    });
    if (reminders.length === 0) return 0;
    const today = istDate(now);
    const occurrences = await this.catalog.aartiOccurrences(
      [...new Set(reminders.map((r) => r.aartiScheduleId))],
      addDays(today, -1),
      addDays(today, 1),
      'en',
    );
    let sent = 0;
    for (const r of reminders) {
      const due = occurrences.find((o) => {
        if (o.scheduleId !== r.aartiScheduleId) return false;
        const start = Date.parse(o.startsAt);
        const fireAt = start - r.minutesBefore * 60_000;
        return fireAt <= now.getTime() && now.getTime() < Math.min(start, fireAt + LATE_GRACE_MS);
      });
      if (!due) continue;
      const startsAt = new Date(due.startsAt);
      if (r.lastOccurrenceAt?.getTime() === startsAt.getTime()) continue;
      const claimed = await this.prisma.aartiReminder.updateMany({
        where: {
          id: r.id,
          OR: [{ lastOccurrenceAt: null }, { lastOccurrenceAt: { not: startsAt } }],
        },
        data: { lastOccurrenceAt: startsAt },
      });
      if (claimed.count !== 1) continue;
      const [contact] = await this.identity.getContacts([r.userId]);
      const lang: Lang = contact?.preferredLang === 'hi' ? 'hi' : 'en';
      const [local] =
        lang === 'en'
          ? [due]
          : await this.catalog.aartiOccurrences([r.aartiScheduleId], due.date, due.date, lang);
      const minutes = Math.max(1, Math.round((startsAt.getTime() - now.getTime()) / 60_000));
      await this.notifications.notifyUsers({
        userIds: [r.userId],
        key: 'aarti_reminder',
        vars: {
          aarti: local?.name ?? due.name,
          temple: local?.templeName ?? due.templeName ?? '',
          time: due.localTime,
          minutes: String(minutes),
        },
        payload: {
          type: 'aarti',
          templeId: due.templeId,
          scheduleId: due.scheduleId,
          startsAt: due.startsAt,
        },
      });
      sent++;
    }
    if (sent > 0) this.logger.log({ sent }, 'aarti reminders sent');
    return sent;
  }
}
