import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { type Prisma } from '@prisma/client';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal, CurrentUser, hasAnyRole, Roles } from '../../../core/auth';
import { AppException, afterCursor, NEWEST_FIRST, pageSize, toPage } from '../../../core/http';
import { Idempotent } from '../../../core/idempotency';
import { PrismaService } from '../../../core/prisma';
import { SettingsService } from '../../../core/settings';
import { CatalogFacade } from '../../catalog';
import { IdentityFacade } from '../../identity';
import { NotificationsFacade } from '../../notifications';
import {
  AuditQueryDto,
  BroadcastDto,
  ConfigDto,
  KpiQueryDto,
  PlatformRoleDto,
  UserQueryDto,
  UserStatusDto,
} from '../dto/admin.dto';
import { KpiService } from '../services/kpi.service';

const UUID = new ParseUUIDPipe();

@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly kpi: KpiService,
    private readonly identity: IdentityFacade,
    private readonly catalog: CatalogFacade,
    private readonly notifications: NotificationsFacade,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('kpis')
  @ApiOperation({
    summary: 'GMV, orders, users, revenue, vendors, SOS, reels and AI usage for a date range (IST)',
  })
  kpis(@Query() q: KpiQueryDto) {
    return this.kpi.kpis(q);
  }

  // ───────────── users ─────────────

  @Get('users')
  users(@Query() q: UserQueryDto) {
    return this.identity.searchUsers(q);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Suspend (revokes sessions) or reactivate a user' })
  async setStatus(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', UUID) id: string,
    @Body() dto: UserStatusDto,
  ) {
    const target = await this.targetUser(u, id);
    await this.identity.setStatus(id, dto.status);
    await this.audit.record({
      actor: u,
      action: `user.${dto.status === 'suspended' ? 'suspend' : 'reactivate'}`,
      entityType: 'user',
      entityId: id,
      before: { status: target.status },
      after: { status: dto.status, reason: dto.reason },
    });
    return { id, status: dto.status };
  }

  @Post('users/:id/roles')
  @HttpCode(200)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Grant admin or super_admin (super admins only)' })
  async grant(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', UUID) id: string,
    @Body() dto: PlatformRoleDto,
  ) {
    await this.targetUser(u, id);
    await this.identity.grantPlatformRole(id, dto.role);
    await this.audit.record({
      actor: u,
      action: 'user.role_grant',
      entityType: 'user',
      entityId: id,
      after: { role: dto.role },
    });
    return { id, granted: dto.role };
  }

  @Delete('users/:id/roles/:role')
  @Roles('super_admin')
  async revoke(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', UUID) id: string,
    @Param('role') role: string,
  ) {
    if (role !== 'admin' && role !== 'super_admin')
      throw AppException.badRequest('Only admin and super_admin are managed here');
    if (id === u.userId) throw AppException.badRequest('You cannot remove your own role');
    if (role === 'super_admin' && (await this.identity.countPlatformRole('super_admin')) <= 1)
      throw AppException.badRequest('Keep at least one super admin');
    await this.identity.revokePlatformRole(id, role);
    await this.audit.record({
      actor: u,
      action: 'user.role_revoke',
      entityType: 'user',
      entityId: id,
      after: { role },
    });
    return { id, revoked: role };
  }

  /** Admin accounts can only be changed by super admins; nobody changes themselves. */
  private async targetUser(actor: AuthPrincipal, id: string) {
    if (id === actor.userId)
      throw AppException.badRequest('You cannot change your own account here');
    const [user] = await this.identity.getContacts([id]);
    if (!user) throw AppException.notFound('User not found');
    const roles = (await this.identity.getAuthUser(id)).roles;
    if (hasAnyRole(roles, ['admin']) && !hasAnyRole(actor.roles, ['super_admin']))
      throw AppException.forbidden();
    return user;
  }

  // ───────────── config (feature flags, banners, settings) ─────────────

  @Get('config')
  config() {
    return this.prisma.appConfig.findMany({ orderBy: [{ kind: 'asc' }, { key: 'asc' }] });
  }

  @Put('config')
  async upsertConfig(@CurrentUser() u: AuthPrincipal, @Body() dto: ConfigDto) {
    const data = {
      kind: dto.kind,
      value: dto.value as Prisma.InputJsonObject,
      targeting: (dto.targeting ?? {}) as Prisma.InputJsonObject,
      isActive: dto.isActive ?? true,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      updatedById: u.userId,
    };
    const before = await this.prisma.appConfig.findUnique({ where: { key: dto.key } });
    const row = await this.prisma.appConfig.upsert({
      where: { key: dto.key },
      create: { key: dto.key, ...data },
      update: data,
    });
    await this.settings.invalidate();
    await this.audit.record({
      actor: u,
      action: 'config.upsert',
      entityType: 'app_config',
      entityId: row.id,
      before: before ? { value: before.value, isActive: before.isActive } : null,
      after: { key: dto.key, value: dto.value, isActive: data.isActive },
    });
    return row;
  }

  @Delete('config/:key')
  @HttpCode(204)
  async deleteConfig(@CurrentUser() u: AuthPrincipal, @Param('key') key: string): Promise<void> {
    const row = await this.prisma.appConfig.findUnique({ where: { key } });
    if (!row) throw AppException.notFound('Setting not found');
    await this.prisma.appConfig.delete({ where: { key } });
    await this.settings.invalidate();
    await this.audit.record({
      actor: u,
      action: 'config.delete',
      entityType: 'app_config',
      entityId: row.id,
      before: { key, value: row.value },
    });
  }

  // ───────────── broadcasts ─────────────

  @Post('broadcasts')
  @HttpCode(202)
  @Idempotent('admin.broadcast')
  @ApiOperation({ summary: 'Push + in-app message to all active users, or one home city' })
  async broadcast(@CurrentUser() u: AuthPrincipal, @Body() dto: BroadcastDto) {
    const cityId = dto.city ? await this.catalog.cityIdBySlug(dto.city) : null;
    const broadcastId = randomUUID();
    await this.notifications.broadcast({
      broadcastId,
      title: dto.title,
      body: dto.body,
      emergency: dto.emergency ?? false,
      homeCityId: cityId ?? null,
    });
    await this.audit.record({
      actor: u,
      action: dto.emergency ? 'broadcast.emergency' : 'broadcast.send',
      entityType: 'broadcast',
      entityId: broadcastId,
      after: { title: dto.title, city: dto.city ?? null },
    });
    return { broadcastId, status: 'queued' };
  }

  // ───────────── audit log ─────────────

  @Get('audit-logs')
  async auditLogs(@Query() q: AuditQueryDto) {
    const limit = pageSize(q.limit);
    const rows = await this.prisma.auditLog.findMany({
      where: {
        ...(q.entityType ? { entityType: q.entityType } : {}),
        ...(q.entityId ? { entityId: q.entityId } : {}),
        ...(q.actorId ? { actorId: q.actorId } : {}),
        ...(q.actionPrefix ? { action: { startsWith: q.actionPrefix } } : {}),
        ...afterCursor(q.cursor),
      },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
    });
    return toPage(rows, limit, (r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  }
}
