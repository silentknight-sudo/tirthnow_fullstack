import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type AuthPrincipal } from '../../core/auth';
import { AppException } from '../../core/http';
import { type VendorPermission } from './permissions';
import { type VendorAccess, VendorAccessService } from './services/vendor-access.service';

export const VENDOR_PERMISSION_KEY = 'vendor:permission';

/**
 * Route param `vid` must be a vendor the caller may act for. Pass a permission to require it,
 * `'owner'` for owner-only routes, or nothing for any member. The resolved access is attached
 * to `req.vendorAccess`.
 */
export const VendorPermissionRequired = (permission: VendorPermission | 'owner' | null = null) =>
  SetMetadata(VENDOR_PERMISSION_KEY, permission);

@Injectable()
export class VendorAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: VendorAccessService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{
      user?: AuthPrincipal;
      params: Record<string, string | undefined>;
      vendorAccess?: VendorAccess;
    }>();
    if (!req.user) throw AppException.unauthorized();
    const vendorId = req.params.vid;
    if (!vendorId || !/^[0-9a-f-]{36}$/i.test(vendorId))
      throw AppException.notFound('Vendor not found');
    const permission =
      this.reflector.getAllAndOverride<VendorPermission | 'owner' | null | undefined>(
        VENDOR_PERMISSION_KEY,
        [ctx.getHandler(), ctx.getClass()],
      ) ?? null;
    req.vendorAccess = await this.access.require(req.user, vendorId, permission);
    return true;
  }
}
