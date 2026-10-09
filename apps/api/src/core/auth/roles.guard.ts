import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ERROR_CODES, type Role } from '@tirth-now/shared-types';
import { AppException } from '../http';
import { IS_PUBLIC_KEY, NO_GUESTS_KEY, ROLES_KEY } from './decorators';
import { type RequestWithPrincipal } from './principal';
import { hasAnyRole } from './role-hierarchy';

/** Global guard (runs after JwtAuthGuard): enforces @Roles() and @NoGuests(). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (ctx.getType() !== 'http') return true;
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, targets) === true)
      return true;

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets) ?? [];
    const noGuests =
      this.reflector.getAllAndOverride<boolean | undefined>(NO_GUESTS_KEY, targets) === true;
    const user = ctx.switchToHttp().getRequest<RequestWithPrincipal>().user;
    if (!user) throw AppException.unauthorized();

    if (noGuests && user.isGuest) {
      throw AppException.forbidden(ERROR_CODES.AUTH_FORBIDDEN, 'Sign in to use this feature');
    }
    if (!hasAnyRole(user.roles, required)) throw AppException.forbidden();
    return true;
  }
}
