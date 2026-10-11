import { Injectable } from '@nestjs/common';
import { ADMIN_ROLES } from '@tirth-now/shared-types';
import { type AuthPrincipal } from '../../../core/auth';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { VENDOR_PERMISSIONS, type VendorPermission } from '../permissions';

export interface VendorAccess {
  vendorId: string;
  role: 'owner' | 'staff' | 'admin';
  permissions: VendorPermission[];
}

/**
 * Authorises a principal for one vendor, against the database (not just JWT claims), so a
 * removed staff member loses access immediately. Admins pass for every vendor.
 */
@Injectable()
export class VendorAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(user: AuthPrincipal, vendorId: string): Promise<VendorAccess> {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
      select: { id: true, ownerUserId: true },
    });
    if (!vendor) throw AppException.notFound('Vendor not found');
    if (vendor.ownerUserId === user.userId) {
      return { vendorId, role: 'owner', permissions: [...VENDOR_PERMISSIONS] };
    }
    const staff = await this.prisma.vendorStaff.findUnique({
      where: { vendorId_userId: { vendorId, userId: user.userId } },
    });
    if (staff?.isActive) {
      const permissions = staff.permissions.filter((p): p is VendorPermission =>
        (VENDOR_PERMISSIONS as readonly string[]).includes(p),
      );
      return { vendorId, role: 'staff', permissions };
    }
    if (user.roles.some((r) => ADMIN_ROLES.includes(r))) {
      return { vendorId, role: 'admin', permissions: [...VENDOR_PERMISSIONS] };
    }
    // Do not reveal whether the vendor exists to outsiders.
    throw AppException.notFound('Vendor not found');
  }

  async require(
    user: AuthPrincipal,
    vendorId: string,
    permission: VendorPermission | 'owner' | null,
  ): Promise<VendorAccess> {
    const access = await this.resolve(user, vendorId);
    if (permission === 'owner' && access.role === 'staff') throw AppException.forbidden();
    if (permission && permission !== 'owner' && !access.permissions.includes(permission)) {
      throw AppException.forbidden();
    }
    return access;
  }
}
