import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser, Roles } from '../../../core/auth';
import { AppException, afterCursor, NEWEST_FIRST, pageSize, toPage } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { IdentityFacade } from '../../identity';
import { ResolveSosDto, SosAdminQueryDto } from '../dto/safety.dto';
import { readTrail, SafetyService } from '../services/safety.service';

@ApiTags('admin · safety')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/sos')
export class SafetyAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safety: SafetyService,
    private readonly identity: IdentityFacade,
  ) {}

  @Get()
  async list(@Query() q: SosAdminQueryDto) {
    const limit = pageSize(q.limit);
    const rows = await this.prisma.sosEvent.findMany({
      where: {
        ...(q.status ? { status: q.status } : {}),
        ...(q.active ? { status: { in: ['triggered', 'dispatched'] } } : {}),
        ...afterCursor(q.cursor),
      },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
    });
    const contacts = new Map(
      (await this.identity.getContacts([...new Set(rows.map((r) => r.userId))])).map((c) => [
        c.id,
        c,
      ]),
    );
    return toPage(rows, limit, (r) => ({
      id: r.id,
      status: r.status,
      user: {
        id: r.userId,
        name: contacts.get(r.userId)?.displayName ?? null,
        phoneE164: contacts.get(r.userId)?.phoneE164 ?? null,
      },
      lat: r.lat,
      lng: r.lng,
      accuracyM: r.accuracyM,
      batteryPct: r.batteryPct,
      createdAt: r.createdAt.toISOString(),
      dispatchedAt: r.dispatchedAt?.toISOString() ?? null,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
    }));
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const sos = await this.prisma.sosEvent.findUnique({ where: { id } });
    if (!sos) throw AppException.notFound('SOS not found');
    const [user] = await this.identity.getContacts([sos.userId]);
    const contacts = await this.identity.emergencyContacts(sos.userId);
    return {
      id: sos.id,
      status: sos.status,
      user: user
        ? { id: user.id, name: user.displayName, phoneE164: user.phoneE164, email: user.email }
        : null,
      emergencyContacts: contacts,
      lat: sos.lat,
      lng: sos.lng,
      accuracyM: sos.accuracyM,
      batteryPct: sos.batteryPct,
      trail: readTrail(sos.locationTrail),
      dispatchResult: sos.dispatchResult,
      shareUrl: this.safety.shareUrl(sos.shareToken),
      shareExpiresAt: sos.shareExpiresAt.toISOString(),
      createdAt: sos.createdAt.toISOString(),
      dispatchedAt: sos.dispatchedAt?.toISOString() ?? null,
      resolvedAt: sos.resolvedAt?.toISOString() ?? null,
      handledById: sos.handledById,
    };
  }

  @Post(':id/resolve')
  @HttpCode(200)
  async resolve(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveSosDto,
  ) {
    const sos = await this.safety.adminResolve(u, id, dto);
    return { id: sos.id, status: sos.status, resolvedAt: sos.resolvedAt?.toISOString() ?? null };
  }
}
