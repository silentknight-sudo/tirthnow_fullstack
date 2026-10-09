import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type Prisma } from '@prisma/client';
import {
  type AccessTokenClaims,
  type AuthUser,
  ERROR_CODES,
  type TokenPair,
} from '@tirth-now/shared-types';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { newOpaqueToken, sha256 } from './secrets';
import { UsersService } from './users.service';

type Db = PrismaService | Prisma.TransactionClient;

export interface ClientContext {
  ip?: string | undefined;
  userAgent?: string | undefined;
}

export interface IssueOptions extends ClientContext {
  /** Existing session (rotation); a new family is started when omitted. */
  familyId?: string;
  deviceId?: string | null;
}

/**
 * Access tokens: HS256 JWT, short-lived. Refresh tokens: opaque, stored as sha256,
 * rotated on every use; presenting a used token revokes its whole family (ADR-0002).
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async issuePair(
    user: AuthUser,
    opts: IssueOptions = {},
    db: Db = this.prisma,
  ): Promise<TokenPair> {
    const now = Date.now();
    const familyId = opts.familyId ?? randomUUID();
    const refreshToken = newOpaqueToken();
    const refreshExpires = new Date(now + this.config.jwt.refreshTtlDays * 86_400_000);

    await db.refreshToken.create({
      data: {
        userId: user.id,
        deviceId: opts.deviceId ?? null,
        tokenHash: sha256(refreshToken),
        familyId,
        expiresAt: refreshExpires,
        ip: opts.ip ?? null,
        userAgent: opts.userAgent?.slice(0, 512) ?? null,
      },
    });

    const claims: AccessTokenClaims = {
      sub: user.id,
      roles: user.roles,
      vendorIds: user.vendorIds,
      sid: familyId,
      guest: user.isGuest,
    };
    const accessToken = await this.jwt.signAsync(claims);
    return {
      accessToken,
      accessTokenExpiresAt: new Date(now + this.config.jwt.accessTtlSeconds * 1000).toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshExpires.toISOString(),
    };
  }

  /** Exchange a refresh token for a new pair in the same family. */
  async rotate(
    refreshToken: string,
    ctx: ClientContext,
  ): Promise<{ pair: TokenPair; user: AuthUser }> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
    });
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw AppException.unauthorized(
        ERROR_CODES.AUTH_REFRESH_INVALID,
        'Refresh token is invalid or expired',
      );
    }
    if (stored.usedAt) {
      await this.revokeFamily(stored.familyId);
      this.logger.warn(
        { userId: stored.userId, familyId: stored.familyId },
        'refresh token reuse detected',
      );
      throw AppException.unauthorized(
        ERROR_CODES.AUTH_REFRESH_REUSED,
        'Session revoked, please sign in again',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Compare-and-set: of two concurrent rotations only one wins; the loser is treated as reuse.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, usedAt: null, revokedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw AppException.unauthorized(
          ERROR_CODES.AUTH_REFRESH_REUSED,
          'Session revoked, please sign in again',
        );
      }
      const user = await this.users.findWithRoles(stored.userId, tx);
      if (!user || user.status !== 'active') {
        await tx.refreshToken.updateMany({
          where: { familyId: stored.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        throw AppException.unauthorized(
          ERROR_CODES.AUTH_ACCOUNT_SUSPENDED,
          'Account is not active',
        );
      }
      const pair = await this.issuePair(
        user.auth,
        { ...ctx, familyId: stored.familyId, deviceId: stored.deviceId },
        tx,
      );
      return { pair, user: user.auth };
    });
  }

  async revokeFamily(familyId: string, userId?: string): Promise<number> {
    const res = await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null, ...(userId ? { userId } : {}) },
      data: { revokedAt: new Date() },
    });
    return res.count;
  }

  async revokeAllForUser(userId: string, db: Db = this.prisma): Promise<number> {
    const res = await db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return res.count;
  }
}
