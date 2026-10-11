import { Injectable } from '@nestjs/common';
import { type AuthUser } from '@tirth-now/shared-types';
import { PrismaService } from '../../core/prisma';
import { type EmergencyContactResponse } from './dto/me.dto';
import { AuthService } from './services/auth.service';
import { DevicesService } from './services/devices.service';
import { EmergencyContactsService } from './services/emergency-contacts.service';
import { UsersService } from './services/users.service';

export interface UserContact {
  id: string;
  displayName: string | null;
  phoneE164: string | null;
  email: string | null;
  preferredLang: string;
  status: string;
  notificationPrefs: Record<string, unknown>;
}

/** Public surface of the identity module for other modules (ADR-0001). */
@Injectable()
export class IdentityFacade {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly devices: DevicesService,
    private readonly contacts: EmergencyContactsService,
    private readonly prisma: PrismaService,
  ) {}

  getAuthUser(userId: string): Promise<AuthUser> {
    return this.auth.me(userId);
  }

  async getContacts(userIds: string[]): Promise<UserContact[]> {
    if (userIds.length === 0) return [];
    const rows = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { profile: true },
    });
    return rows.map((u) => ({
      id: u.id,
      displayName: u.profile?.displayName ?? null,
      phoneE164: u.phoneE164,
      email: u.email,
      preferredLang: u.profile?.preferredLang ?? 'en',
      status: u.status,
      notificationPrefs:
        typeof u.profile?.notificationPrefs === 'object' &&
        u.profile.notificationPrefs !== null &&
        !Array.isArray(u.profile.notificationPrefs)
          ? (u.profile.notificationPrefs as Record<string, unknown>)
          : {},
    }));
  }

  /** App users with these phone numbers (to push SOS alerts to contacts who use the app). */
  async findUserIdsByPhones(phones: string[]): Promise<Map<string, string>> {
    if (phones.length === 0) return new Map();
    const rows = await this.prisma.user.findMany({
      where: { phoneE164: { in: phones }, status: 'active' },
      select: { id: true, phoneE164: true },
    });
    return new Map(rows.flatMap((r) => (r.phoneE164 ? [[r.phoneE164, r.id] as const] : [])));
  }

  emergencyContacts(userId: string): Promise<EmergencyContactResponse[]> {
    return this.contacts.list(userId);
  }

  pushTokens(userIds: string[]): Promise<{ userId: string; deviceId: string; token: string }[]> {
    return this.devices.pushTokens(userIds);
  }

  forgetPushToken(token: string): Promise<void> {
    return this.devices.forgetToken(token);
  }

  /** Grant a vendor-scoped role (vendor onboarding, staff invites). */
  async grantVendorRole(
    userId: string,
    role: 'vendor_owner' | 'vendor_staff',
    vendorId: string,
  ): Promise<void> {
    await this.users.grantRole(this.prisma, userId, role, vendorId);
  }

  async revokeVendorRole(
    userId: string,
    role: 'vendor_owner' | 'vendor_staff',
    vendorId: string,
  ): Promise<void> {
    await this.prisma.userRole.deleteMany({ where: { userId, vendorId, role: { key: role } } });
  }

  async findUserByEmailOrPhone(identifier: {
    email?: string;
    phoneE164?: string;
  }): Promise<{ id: string } | null> {
    if (identifier.email) {
      return this.prisma.user.findFirst({
        where: { email: identifier.email.toLowerCase(), status: 'active' },
        select: { id: true },
      });
    }
    if (identifier.phoneE164) {
      return this.prisma.user.findFirst({
        where: { phoneE164: identifier.phoneE164, status: 'active' },
        select: { id: true },
      });
    }
    return null;
  }

  /** Admin: change account status; suspension revokes every session immediately. */
  async setStatus(userId: string, status: 'active' | 'suspended'): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status } });
      if (status === 'suspended') {
        await tx.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    });
  }
}
