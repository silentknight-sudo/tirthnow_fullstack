import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { AuditService } from '../../../core/audit';
import { AppException } from '../../../core/http';
import { MaintenanceRegistry } from '../../../core/maintenance';
import { PrismaService } from '../../../core/prisma';
import { FilesFacade } from '../../files';
import { type ProfileResponse, type UpdateProfileDto } from '../dto/me.dto';
import { TokenService } from './token.service';
import { toAuthUser } from './users.service';

const asRecord = (v: Prisma.JsonValue | undefined): Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? v : {};

/** Own fields with a value (DTO instances may carry unset optional fields). */
const defined = (o: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

@Injectable()
export class ProfileService implements OnModuleInit {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesFacade,
    private readonly tokens: TokenService,
    private readonly maintenance: MaintenanceRegistry,
    private readonly audit: AuditService,
  ) {}

  onModuleInit(): void {
    this.maintenance.register('refresh-tokens', async () => {
      const cutoff = new Date(Date.now() - 7 * 86_400_000);
      const res = await this.prisma.refreshToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] },
      });
      return res.count;
    });
  }

  async get(userId: string): Promise<ProfileResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: { not: 'deleted' } },
      include: {
        profile: { include: { avatar: true } },
        roles: { select: { vendorId: true, role: { select: { key: true } } } },
      },
    });
    if (!user) throw AppException.notFound('User not found');
    const auth = toAuthUser({
      ...user,
      profile: user.profile ? { displayName: user.profile.displayName } : null,
    });
    const avatar = user.profile?.avatar;
    return {
      id: user.id,
      displayName: user.profile?.displayName ?? null,
      email: user.email,
      phoneE164: user.phoneE164,
      isGuest: user.isGuest,
      preferredLang: user.profile?.preferredLang ?? 'en',
      homeCityId: user.profile?.homeCityId ?? null,
      avatarUrl: avatar && avatar.status === 'ready' ? await this.files.url(avatar, 'thumb') : null,
      accessibility: asRecord(user.profile?.accessibility),
      notificationPrefs: asRecord(user.profile?.notificationPrefs),
      roles: auth.roles,
      vendorIds: auth.vendorIds,
    };
  }

  async update(userId: string, dto: UpdateProfileDto): Promise<ProfileResponse> {
    if (dto.avatarMediaId) {
      await this.files.requireReady(dto.avatarMediaId, {
        ownerUserId: userId,
        purposes: ['avatar'],
      });
    }
    const existing = await this.prisma.userProfile.findUnique({ where: { userId } });
    const data = {
      ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
      ...(dto.preferredLang !== undefined ? { preferredLang: dto.preferredLang } : {}),
      ...(dto.homeCityId !== undefined ? { homeCityId: dto.homeCityId } : {}),
      ...(dto.avatarMediaId !== undefined ? { avatarMediaId: dto.avatarMediaId } : {}),
      // Partial updates merge into the stored JSON.
      ...(dto.accessibility !== undefined
        ? {
            accessibility: {
              ...asRecord(existing?.accessibility),
              ...defined(dto.accessibility),
            } as Prisma.InputJsonObject,
          }
        : {}),
      ...(dto.notificationPrefs !== undefined
        ? {
            notificationPrefs: {
              ...asRecord(existing?.notificationPrefs),
              ...defined(dto.notificationPrefs),
            } as Prisma.InputJsonObject,
          }
        : {}),
    };
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.get(userId);
  }

  /**
   * Account deletion (app-store requirement): personal data is removed, sessions revoked,
   * and the row kept as `deleted` so orders, payments and audit history stay consistent.
   */
  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'deleted',
          deletedAt: new Date(),
          firebaseUid: null,
          email: null,
          phoneE164: null,
          passwordHash: null,
          mfaEnabled: false,
        },
      });
      await tx.userProfile.updateMany({
        where: { userId },
        data: { displayName: null, avatarMediaId: null, accessibility: {}, notificationPrefs: {} },
      });
      await tx.emergencyContact.deleteMany({ where: { userId } });
      await tx.device.deleteMany({ where: { userId } });
      await this.tokens.revokeAllForUser(userId, tx);
      await this.audit.record(
        { actor: null, action: 'user.self_delete', entityType: 'user', entityId: userId },
        tx,
      );
    });
    this.logger.log({ userId }, 'account deleted');
  }
}
