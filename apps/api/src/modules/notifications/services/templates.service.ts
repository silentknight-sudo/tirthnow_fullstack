import { Injectable } from '@nestjs/common';
import { type NotifChannel } from '@prisma/client';
import { type Lang } from '@tirth-now/shared-types';
import { CacheService } from '../../../core/cache';
import { t } from '../../../core/i18n';
import { PrismaService } from '../../../core/prisma';
import { render, type TemplateKey, TEMPLATES, type Vars } from '../templates';

export interface ResolvedTemplate {
  key: TemplateKey;
  channel: NotifChannel;
  /** DB row id when an override exists. */
  templateId: string | null;
  title: string;
  body: string;
  dltTemplateId: string | null;
  whatsappTemplateName: string;
  params: string[];
}

interface Override {
  id: string;
  titleI18n: unknown;
  bodyI18n: unknown;
  dltTemplateId: string | null;
  whatsappTemplateName: string | null;
}

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async resolve(
    key: TemplateKey,
    channel: NotifChannel,
    lang: Lang,
    vars: Vars,
  ): Promise<ResolvedTemplate> {
    const builtIn = TEMPLATES[key];
    const override = await this.override(key, channel);
    const title = override?.titleI18n ? t(override.titleI18n, lang) : builtIn.title[lang];
    const body = override ? t(override.bodyI18n, lang) : builtIn.body[lang];
    return {
      key,
      channel,
      templateId: override?.id ?? null,
      title: render(title, vars),
      body: render(body, vars),
      dltTemplateId: override?.dltTemplateId ?? null,
      whatsappTemplateName: override?.whatsappTemplateName ?? key,
      params: builtIn.variables.map((v) => vars[v] ?? ''),
    };
  }

  private override(key: TemplateKey, channel: NotifChannel): Promise<Override | null> {
    return this.cache.getOrSet(`notif-tpl:${key}:${channel}`, 60, () =>
      this.prisma.notificationTemplate.findFirst({
        where: { key, channel, isActive: true },
        select: {
          id: true,
          titleI18n: true,
          bodyI18n: true,
          dltTemplateId: true,
          whatsappTemplateName: true,
        },
      }),
    );
  }

  async invalidate(key: string, channel: NotifChannel): Promise<void> {
    await this.cache.del(`notif-tpl:${key}:${channel}`);
  }
}
