import { Injectable } from '@nestjs/common';
import { type Vendor } from '@prisma/client';
import { type AuthPrincipal } from '../../core/auth';
import { CacheService } from '../../core/cache';
import { PrismaService } from '../../core/prisma';
import { type VendorPermission } from './permissions';
import { type DecryptedBankAccount, BankAccountsService } from './services/bank-accounts.service';
import { type VendorAccess, VendorAccessService } from './services/vendor-access.service';
import { ACTIVE_VENDORS_CACHE_KEY } from './services/vendor-admin.service';

/** Public surface of the vendors module. */
@Injectable()
export class VendorsFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly access: VendorAccessService,
    private readonly bank: BankAccountsService,
  ) {}

  /** Ids of vendors whose listings are visible (status active). Cached 60 s, cleared on status changes. */
  async activeVendorIds(): Promise<string[]> {
    return this.cache.getOrSet(ACTIVE_VENDORS_CACHE_KEY, 60, async () =>
      (
        await this.prisma.vendor.findMany({
          where: { status: 'active', deletedAt: null },
          select: { id: true },
        })
      ).map((v) => v.id),
    );
  }

  async isActive(vendorId: string): Promise<boolean> {
    return (await this.activeVendorIds()).includes(vendorId);
  }

  get(vendorId: string): Promise<Vendor | null> {
    return this.prisma.vendor.findFirst({ where: { id: vendorId, deletedAt: null } });
  }

  requireAccess(
    user: AuthPrincipal,
    vendorId: string,
    permission: VendorPermission | 'owner' | null,
  ): Promise<VendorAccess> {
    return this.access.require(user, vendorId, permission);
  }

  /** Owner + active staff with the permission (who to notify about a new order, etc.). */
  async memberUserIds(vendorId: string, permission?: VendorPermission): Promise<string[]> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        ownerUserId: true,
        staff: { where: { isActive: true }, select: { userId: true, permissions: true } },
      },
    });
    if (!vendor) return [];
    const staff = vendor.staff
      .filter((s) => !permission || s.permissions.includes(permission))
      .map((s) => s.userId);
    return [vendor.ownerUserId, ...staff];
  }

  primaryBankAccount(vendorId: string): Promise<DecryptedBankAccount | null> {
    return this.bank.primaryDecrypted(vendorId);
  }

  markBankAccountVerified(accountId: string): Promise<void> {
    return this.bank.markVerified(accountId);
  }

  async setLinkedAccountId(vendorId: string, linkedAccountId: string): Promise<void> {
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { razorpayLinkedAccountId: linkedAccountId },
    });
  }
}
