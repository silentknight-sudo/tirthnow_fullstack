import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { IdentityFacade } from '../../identity';
import { type InviteStaffDto, type StaffResponse, type UpdateStaffDto } from '../dto/vendors.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityFacade,
    private readonly audit: AuditService,
  ) {}

  async list(vendorId: string): Promise<StaffResponse[]> {
    const rows = await this.prisma.vendorStaff.findMany({
      where: { vendorId },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((s) => ({
      id: s.id,
      userId: s.userId,
      displayName: s.user.profile?.displayName ?? null,
      permissions: s.permissions,
      isActive: s.isActive,
    }));
  }

  /** Staff must already have a Tirth Now account (app or portal). */
  async invite(
    actor: AuthPrincipal,
    vendorId: string,
    dto: InviteStaffDto,
  ): Promise<StaffResponse> {
    const target = await this.identity.findUserByEmailOrPhone({
      email: dto.email,
      phoneE164: dto.phoneE164,
    });
    if (!target)
      throw AppException.notFound('No active Tirth Now account with that email or phone');
    const vendor = await this.prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } });
    if (vendor.ownerUserId === target.id)
      throw AppException.badRequest('The owner is already a member');
    const row = await this.prisma.vendorStaff.upsert({
      where: { vendorId_userId: { vendorId, userId: target.id } },
      create: { vendorId, userId: target.id, permissions: dto.permissions, isActive: true },
      update: { permissions: dto.permissions, isActive: true },
    });
    await this.identity.grantVendorRole(target.id, 'vendor_staff', vendorId);
    await this.audit.record({
      actor,
      action: 'vendor.staff_invite',
      entityType: 'vendor',
      entityId: vendorId,
      after: { staffUserId: target.id, permissions: dto.permissions },
    });
    return (await this.list(vendorId)).find((s) => s.id === row.id) as StaffResponse;
  }

  async update(
    actor: AuthPrincipal,
    vendorId: string,
    staffId: string,
    dto: UpdateStaffDto,
  ): Promise<StaffResponse> {
    const existing = await this.prisma.vendorStaff.findFirst({ where: { id: staffId, vendorId } });
    if (!existing) throw AppException.notFound('Staff member not found');
    await this.prisma.vendorStaff.update({ where: { id: staffId }, data: dto });
    if (dto.isActive === false)
      await this.identity.revokeVendorRole(existing.userId, 'vendor_staff', vendorId);
    if (dto.isActive === true)
      await this.identity.grantVendorRole(existing.userId, 'vendor_staff', vendorId);
    await this.audit.record({
      actor,
      action: 'vendor.staff_update',
      entityType: 'vendor',
      entityId: vendorId,
      before: existing,
      after: dto,
    });
    return (await this.list(vendorId)).find((s) => s.id === staffId) as StaffResponse;
  }

  async remove(actor: AuthPrincipal, vendorId: string, staffId: string): Promise<void> {
    const existing = await this.prisma.vendorStaff.findFirst({ where: { id: staffId, vendorId } });
    if (!existing) throw AppException.notFound('Staff member not found');
    await this.prisma.vendorStaff.delete({ where: { id: staffId } });
    await this.identity.revokeVendorRole(existing.userId, 'vendor_staff', vendorId);
    await this.audit.record({
      actor,
      action: 'vendor.staff_remove',
      entityType: 'vendor',
      entityId: vendorId,
      before: existing,
    });
  }
}
