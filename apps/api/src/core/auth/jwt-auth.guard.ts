import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { type AccessTokenClaims, ERROR_CODES, isRole } from '@tirth-now/shared-types';
import { AppException } from '../http';
import { IS_PUBLIC_KEY } from './decorators';
import { type RequestWithPrincipal } from './principal';

function bearerToken(header: unknown): string | null {
  if (typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

function isClaims(value: unknown): value is AccessTokenClaims {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sub === 'string' &&
    typeof v.sid === 'string' &&
    typeof v.guest === 'boolean' &&
    Array.isArray(v.roles) &&
    v.roles.every(isRole) &&
    Array.isArray(v.vendorIds) &&
    v.vendorIds.every((x) => typeof x === 'string')
  );
}

/** Global guard: verifies the access JWT unless the route is @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic === true) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithPrincipal>();
    const token = bearerToken(req.headers.authorization);
    if (!token) throw AppException.unauthorized();

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw AppException.unauthorized(
        ERROR_CODES.AUTH_UNAUTHENTICATED,
        'Access token is invalid or expired',
      );
    }
    if (!isClaims(payload)) throw AppException.unauthorized();

    req.user = {
      userId: payload.sub,
      roles: payload.roles,
      vendorIds: payload.vendorIds,
      sessionId: payload.sid,
      isGuest: payload.guest,
    };
    return true;
  }
}
