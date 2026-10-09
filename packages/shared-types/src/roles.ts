export const ROLES = ['user', 'vendor_owner', 'vendor_staff', 'admin', 'super_admin'] as const;
export type Role = (typeof ROLES)[number];

export const ADMIN_ROLES: readonly Role[] = ['admin', 'super_admin'];
export const VENDOR_ROLES: readonly Role[] = ['vendor_owner', 'vendor_staff'];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
