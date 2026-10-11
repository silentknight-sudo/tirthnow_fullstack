/** Fine-grained permissions a vendor owner can grant to staff. Owners hold all of them. */
export const VENDOR_PERMISSIONS = [
  'listings.edit',
  'inventory.edit',
  'orders.manage',
  'finance.view',
  'reviews.reply',
] as const;
export type VendorPermission = (typeof VENDOR_PERMISSIONS)[number];

/** Owner-only capabilities (never grantable). */
export type OwnerCapability = 'owner';
