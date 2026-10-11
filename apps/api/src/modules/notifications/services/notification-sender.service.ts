import { Inject, Injectable, Logger } from '@nestjs/common';
import { type Notification } from '@prisma/client';
import { UnrecoverableError } from 'bullmq';
import { PrismaService } from '../../../core/prisma';
import {
  EMAIL_PROVIDER,
  type EmailProvider,
  PUSH_PROVIDER,
  type PushProvider,
  SMS_PROVIDER,
  type SmsProvider,
  SmsRejectedError,
  WHATSAPP_PROVIDER,
  type WhatsAppProvider,
} from '../../../core/providers';
import { IdentityFacade } from '../../identity';
import { TEMPLATES } from '../templates';
import { readData } from './notifications.service';
import { TemplatesService } from './templates.service';

export type SendOutcome = 'sent' | 'failed' | 'skipped';

/** Delivers one queued notification row through its channel's provider. */
@Injectable()
export class NotificationSender {
  private readonly logger = new Logger(NotificationSender.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityFacade,
    private readonly templates: TemplatesService,
    @Inject(PUSH_PROVIDER) private readonly push: PushProvider,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
  ) {}

  /**
   * Throws on transient provider errors (the caller retries); permanent failures are recorded
   * and reported as `failed`. `finalAttempt` records transient errors as failed too.
   */
  async send(notificationId: string, finalAttempt = false): Promise<SendOutcome> {
    const n = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (n?.status !== 'queued') return 'skipped';
    try {
      const messageId = await this.deliver(n);
      if (messageId === null) return 'failed';
      await this.prisma.notification.updateMany({
        where: { id: n.id, status: 'queued' },
        data: { status: 'sent', sentAt: new Date(), providerMessageId: messageId, error: null },
      });
      return 'sent';
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const permanent = err instanceof SmsRejectedError || err instanceof UnrecoverableError;
      if (permanent || finalAttempt) {
        await this.fail(n, message);
        return 'failed';
      }
      await this.prisma.notification.update({ where: { id: n.id }, data: { error: message } });
      throw err;
    }
  }

  /** Returns the provider message id, or null after recording a permanent failure. */
  private async deliver(n: Notification): Promise<string | null> {
    const data = readData(n.data);
    if (!data) {
      await this.fail(n, 'notification has no template data');
      return null;
    }
    const tpl = TEMPLATES[data.template];
    switch (n.channel) {
      case 'push': {
        if (!n.userId) return this.failNull(n, 'push needs a user');
        const tokens = await this.identity.pushTokens([n.userId]);
        if (tokens.length === 0) return this.failNull(n, 'no registered devices');
        const results = await this.push.send(
          tokens.map((d) => d.token),
          {
            title: n.title ?? '',
            body: n.body,
            data: { ...data.payload, notificationId: n.id, template: data.template },
            priority: tpl.priority,
            channel: tpl.androidChannel,
          },
        );
        for (const r of results.filter((x) => x.invalidToken))
          await this.identity.forgetPushToken(r.token);
        const ok = results.find((r) => r.ok);
        if (!ok)
          return this.failNull(
            n,
            results
              .map((r) => r.error)
              .filter(Boolean)
              .join('; ') || 'push rejected',
          );
        return ok.messageId ?? '';
      }
      case 'sms': {
        if (!n.recipient) return this.failNull(n, 'no phone number');
        const lang = 'en';
        const r = await this.templates.resolve(data.template, 'sms', lang, data.vars);
        const res = await this.sms.send({
          to: n.recipient,
          text: n.body,
          templateId: r.dltTemplateId,
          variables: data.vars,
          tag: data.template,
        });
        return res.messageId;
      }
      case 'whatsapp': {
        if (!n.recipient) return this.failNull(n, 'no phone number');
        const r = await this.templates.resolve(data.template, 'whatsapp', 'en', data.vars);
        const res = await this.whatsapp.sendTemplate({
          to: n.recipient,
          templateName: r.whatsappTemplateName,
          lang: /[ऀ-ॿ]/.test(n.body) ? 'hi' : 'en',
          params: r.params,
          text: n.body,
        });
        return res.messageId;
      }
      case 'email': {
        if (!n.recipient) return this.failNull(n, 'no email address');
        const res = await this.email.send({
          to: n.recipient,
          subject: n.title ?? 'Tirth Now',
          text: n.body,
          tag: data.template,
        });
        return res.messageId;
      }
      case 'in_app':
        return n.id;
    }
  }

  private async failNull(n: Notification, reason: string): Promise<null> {
    await this.fail(n, reason);
    return null;
  }

  private async fail(n: Notification, reason: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: n.id, status: 'queued' },
      data: { status: 'failed', error: reason.slice(0, 500) },
    });
    this.logger.warn(
      { notificationId: n.id, channel: n.channel, reason },
      'notification not delivered',
    );
  }
}
