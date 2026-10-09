import { type Role } from '@tirth-now/shared-types';

const IMPLIES: Partial<Record<Role, Role[]>> = {
  super_admin: ['admin'],
  vendor_owner: ['vendor_staff'],
};

export function expandRoles(roles: readonly Role[]): Set<Role> {
  const out = new Set<Role>(roles);
  for (const r of roles) for (const implied of IMPLIES[r] ?? []) out.add(implied);
  return out;
}

export function hasAnyRole(held: readonly Role[], required: readonly Role[]): boolean {
  if (required.length === 0) return true;
  const expanded = expandRoles(held);
  return required.some((r) => expanded.has(r));
}
