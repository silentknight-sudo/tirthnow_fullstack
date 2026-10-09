import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Role } from '@tirth-now/shared-types';
import { AppException } from '../../http';
import { NoGuests, Public, Roles } from '../decorators';
import { type AuthPrincipal } from '../principal';
import { hasAnyRole } from '../role-hierarchy';
import { RolesGuard } from '../roles.guard';

class Probe {
  open(): void {}
  @Public() publicRoute(): void {}
  @Roles('admin') adminOnly(): void {}
  @Roles('vendor_staff') vendorStaff(): void {}
  @NoGuests() noGuests(): void {}
}

function ctx(handler: keyof Probe, user?: Partial<AuthPrincipal>): ExecutionContext {
  const principal: AuthPrincipal | undefined = user
    ? { userId: 'u1', roles: ['user'], vendorIds: [], sessionId: 's1', isGuest: false, ...user }
    : undefined;
  return {
    getType: () => 'http',
    getHandler: () => Probe.prototype[handler],
    getClass: () => Probe,
    switchToHttp: () => ({ getRequest: () => ({ user: principal, headers: {} }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('allows public routes without a user', () => {
    expect(guard.canActivate(ctx('publicRoute'))).toBe(true);
  });

  it('requires a principal on protected routes', () => {
    expect(() => guard.canActivate(ctx('open'))).toThrow(AppException);
  });

  it('allows any authenticated user when no roles are declared', () => {
    expect(guard.canActivate(ctx('open', {}))).toBe(true);
  });

  it('enforces @Roles', () => {
    expect(() => guard.canActivate(ctx('adminOnly', { roles: ['user'] }))).toThrow(AppException);
    expect(guard.canActivate(ctx('adminOnly', { roles: ['admin'] }))).toBe(true);
  });

  it('treats super_admin as admin and vendor_owner as vendor_staff', () => {
    expect(guard.canActivate(ctx('adminOnly', { roles: ['super_admin'] }))).toBe(true);
    expect(guard.canActivate(ctx('vendorStaff', { roles: ['vendor_owner'] }))).toBe(true);
    expect(() => guard.canActivate(ctx('vendorStaff', { roles: ['admin'] }))).toThrow(AppException);
  });

  it('blocks guests on @NoGuests routes', () => {
    expect(() => guard.canActivate(ctx('noGuests', { isGuest: true }))).toThrow(AppException);
    expect(guard.canActivate(ctx('noGuests', { isGuest: false }))).toBe(true);
  });
});

describe('hasAnyRole', () => {
  it.each<[Role[], Role[], boolean]>([
    [['user'], [], true],
    [['user'], ['admin'], false],
    [['super_admin'], ['admin'], true],
    [['admin'], ['super_admin'], false],
    [['vendor_staff'], ['vendor_owner'], false],
  ])('%j satisfies %j → %s', (held, required, expected) => {
    expect(hasAnyRole(held, required)).toBe(expected);
  });
});
