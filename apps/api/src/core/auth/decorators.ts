import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import { type Role } from '@tirth-now/shared-types';
import { AppException } from '../http';
import { type AuthPrincipal, type RequestWithPrincipal } from './principal';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const ROLES_KEY = 'auth:roles';
export const NO_GUESTS_KEY = 'auth:noGuests';

/** Route needs no access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Caller must hold at least one of the roles (super_admin ⊇ admin, vendor_owner ⊇ vendor_staff). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Guest (anonymous) sessions are rejected; the user must sign in with a real credential. */
export const NoGuests = () => SetMetadata(NO_GUESTS_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal => {
    const req = ctx.switchToHttp().getRequest<RequestWithPrincipal>();
    if (!req.user) throw AppException.unauthorized();
    return req.user;
  },
);
