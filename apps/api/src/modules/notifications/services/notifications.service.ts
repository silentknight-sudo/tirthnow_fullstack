import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type NotifChannel, type Notification, type Prisma } from '@prisma/client';
import { isLang, type Lang } from '@tirth-now/shared-types';
import { type Queue } from 'bullmq';
import {
  AppException,
  afterCursor,
  NEWEST_FIRST,
  type Page,
  pageSize,
  toPage,
} from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { QUEUES } from '../../../core/queue';
import { IdentityFacade, type UserContact } from '../../identity';
import { type NotificationResponse } from '../dto/notifications.dto';
import { type TemplateCategory, type TemplateKey, TEMPLATES, type Vars } from '../templates';
import { TemplatesService } from './templates.service';

export const SEND_JOB = 'send-notification';

export interface NotifyUsersInput {
  userIds: string[];
  key: TemplateKey;
  vars: Vars;
  /** String key/values for the app (deep links); delivered with push and kept on in-app rows. */
  payload?: Record<string, string>;
  /** Subset of the template's channels. */
  channels?: NotifChannel[];
  /** Deliver push immediately from the caller instead of via the queue (SOS). */
  enqueue?: boolean;
}

export interface NotifyPhonesInput {
  recipients: { phone: string; lang: Lang }[];
  key: TemplateKey;
  vars: Vars;
  channels: ('sms' | 'whatsapp')[];
  enqueue?: boolean;
}

/** Stored on each row so the sender can re-render for gateways that need template params. */
export interface NotificationData {
  payload: Record<string, string>;
  template: TemplateKey;
  vars: Vars;
}

const langOf = (c: UserContact): Lang => (isLang(c.preferredLang) ? c.preferredLang : 'en');

/** Whether a user's preferences allow this category (safety and system always go out). */
export function allowedByPrefs(
  category: TemplateCategory,
  prefs: Record<string, unknown>,
): boolean {
  switch (category) {
    case 'orders':
      return prefs.bookingUpdates !== false;
    case 'aarti':
      return prefs.aartiReminders !== false;
    case 'marketing':
      return prefs.marketing === true;
    default:
      return true;
  }
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityFacade,
    private readonly templates: TemplatesService,
    @InjectQueue(QUEUES.notifications) private readonly queue: Queue,
  ) {}

  /** Create notification rows for app users and queue the outbound ones. Returns queued row ids. */
  async notifyUsers(input: NotifyUsersInput): Promise<string[]> {
    const tpl = TEMPLATES[input.key];
    const channels = (tpl.channels as NotifChannel[]).filter(
      (c) => !input.channels || input.channels.includes(c),
    );
    const users = (await this.identity.getContacts([...new Set(input.userIds)])).filter(
      (u) => u.status === 'active' && allowedByPrefs(tpl.category, u.notificationPrefs),
    );
    const outbound: string[] = [];
    for (const user of users) {
      const lang = langOf(user);
      for (const channel of channels) {
        const recipient =
          channel === 'sms' || channel === 'whatsapp'
            ? user.phoneE164
            : channel === 'email'
              ? user.email
              : null;
        if ((channel === 'sms' || channel === 'whatsapp' || channel === 'email') && !recipient)
          continue;
        const row = await this.createRow(
          user.id,
          channel,
          recipient,
          input.key,
          lang,
          input.vars,
          input.payload ?? {},
        );
        if (channel !== 'in_app') outbound.push(row.id);
      }
    }
    if (input.enqueue !== false) await this.enqueue(outbound, tpl.priority);
    return outbound;
  }

  /** SMS / WhatsApp to phone numbers that may not belong to app users (SOS contacts). */
  async notifyPhones(input: NotifyPhonesInput): Promise<string[]> {
    const ids: string[] = [];
    for (const r of input.recipients) {
      for (const channel of input.channels) {
        const row = await this.createRow(null, channel, r.phone, input.key, r.lang, input.vars, {});
        ids.push(row.id);
      }
    }
    if (input.enqueue !== false) await this.enqueue(ids, TEMPLATES[input.key].priority);
    return ids;
  }

  async enqueue(ids: string[], priority: 'normal' | 'high' = 'normal'): Promise<void> {
    if (ids.length === 0) return;
    await this.queue.addBulk(
      ids.map((id) => ({
        name: SEND_JOB,
        data: { notificationId: id },
        opts: { jobId: `notif-${id}`, priority: priority === 'high' ? 1 : 5 },
      })),
    );
  }

  private async createRow(
    userId: string | null,
    channel: NotifChannel,
    recipient: string | null,
    key: TemplateKey,
    lang: Lang,
    vars: Vars,
    payload: Record<string, string>,
  ): Promise<Notification> {
    const r = await this.templates.resolve(key, channel, lang, vars);
    const data: NotificationData = { payload, template: key, vars };
    return this.prisma.notification.create({
      data: {
        userId,
        templateId: r.templateId,
        channel,
        recipient,
        title: r.title,
        body: r.body,
        data: data as unknown as Prisma.InputJsonObject,
        // In-app rows are delivered by being stored.
        status: channel === 'in_app' ? 'delivered' : 'queued',
        sentAt: channel === 'in_app' ? new Date() : null,
      },
    });
  }

  // ───────────── notification centre ─────────────

  async list(
    userId: string,
    q: { cursor?: string; limit?: number; unreadOnly?: boolean },
  ): Promise<Page<NotificationResponse> & { unreadCount: number }> {
    const limit = pageSize(q.limit);
    const where = { userId, channel: 'in_app' as const };
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { ...where, ...(q.unreadOnly ? { readAt: null } : {}), ...afterCursor(q.cursor) },
        orderBy: NEWEST_FIRST,
        take: limit + 1,
      }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { ...toPage(rows, limit, toResponse), unreadCount };
  }

  async markRead(userId: string, id: string): Promise<NotificationResponse> {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId, channel: 'in_app' },
    });
    if (!row) throw AppException.notFound('Notification not found');
    if (row.readAt) return toResponse(row);
    return toResponse(
      await this.prisma.notification.update({
        where: { id },
        data: { readAt: new Date(), status: 'read' },
      }),
    );
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { userId, channel: 'in_app', readAt: null },
      data: { readAt: new Date(), status: 'read' },
    });
    return { updated: res.count };
  }
}

export function readData(value: Prisma.JsonValue): NotificationData | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.template !== 'string' || !(v.template in TEMPLATES)) return null;
  const strings = (o: unknown): Record<string, string> =>
    typeof o === 'object' && o !== null && !Array.isArray(o)
      ? Object.fromEntries(
          Object.entries(o).filter((e): e is [string, string] => typeof e[1] === 'string'),
        )
      : {};
  return {
    template: v.template as TemplateKey,
    vars: strings(v.vars),
    payload: strings(v.payload),
  };
}

function toResponse(n: Notification): NotificationResponse {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    data: readData(n.data)?.payload ?? {},
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}
