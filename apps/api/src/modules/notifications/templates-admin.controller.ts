import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../../core/audit';
import { type AuthPrincipal, CurrentUser, Roles } from '../../core/auth';
import { AppException } from '../../core/http';
import { i18nJson } from '../../core/i18n';
import { PrismaService } from '../../core/prisma';
import { UpsertTemplateDto } from './dto/templates.dto';
import { TemplatesService } from './services/templates.service';
import { TEMPLATES, type TemplateKey } from './templates';

@ApiTags('admin · notifications')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/notification-templates')
export class TemplatesAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: TemplatesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Built-in templates with any database overrides' })
  async list() {
    const overrides = await this.prisma.notificationTemplate.findMany({
      orderBy: [{ key: 'asc' }, { channel: 'asc' }],
    });
    return Object.entries(TEMPLATES).map(([key, tpl]) => ({
      key,
      channels: tpl.channels,
      category: tpl.category,
      variables: tpl.variables,
      builtIn: { title: tpl.title, body: tpl.body },
      overrides: overrides.filter((o) => o.key === key),
    }));
  }

  @Put()
  async upsert(@CurrentUser() u: AuthPrincipal, @Body() dto: UpsertTemplateDto) {
    const tpl = TEMPLATES[dto.key as TemplateKey];
    if (!(tpl.channels as string[]).includes(dto.channel))
      throw AppException.badRequest(`${dto.key} is not sent on ${dto.channel}`);
    const data = {
      titleI18n: dto.title ? i18nJson(dto.title) : undefined,
      bodyI18n: i18nJson(dto.body),
      dltTemplateId: dto.dltTemplateId ?? null,
      whatsappTemplateName: dto.whatsappTemplateName ?? null,
      variables: tpl.variables,
      isActive: dto.isActive ?? true,
    };
    const row = await this.prisma.notificationTemplate.upsert({
      where: { key_channel: { key: dto.key, channel: dto.channel } },
      create: { key: dto.key, channel: dto.channel, ...data },
      update: data,
    });
    await this.templates.invalidate(dto.key, dto.channel);
    await this.audit.record({
      actor: u,
      action: 'notification_template.upsert',
      entityType: 'notification_template',
      entityId: row.id,
      after: { key: dto.key, channel: dto.channel },
    });
    return row;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const row = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!row) throw AppException.notFound('Template override not found');
    // Notifications keep their template_id; deactivate rather than delete.
    await this.prisma.notificationTemplate.update({ where: { id }, data: { isActive: false } });
    await this.templates.invalidate(row.key, row.channel);
    await this.audit.record({
      actor: u,
      action: 'notification_template.deactivate',
      entityType: 'notification_template',
      entityId: id,
    });
  }
}
