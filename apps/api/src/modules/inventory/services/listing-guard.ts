import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { AppException } from '../../../core/http';
import { type VendorsFacade } from '../../vendors';

/** Listings can be published only by active vendors. */
export async function assertCanPublish(
  vendors: VendorsFacade,
  vendorId: string,
  publishing: boolean | undefined,
): Promise<void> {
  if (publishing === true && !(await vendors.isActive(vendorId))) {
    throw new AppException(
      ERROR_CODES.VENDOR_NOT_ACTIVE,
      HttpStatus.CONFLICT,
      'Listings can be published after your vendor account is approved',
    );
  }
}
