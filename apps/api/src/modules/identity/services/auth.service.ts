import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import {
  ADMIN_ROLES,
  type AuthResult,
  type AuthUser,
  ERROR_CODES,
  type OtpChallenge,
} from '@tirth-now/shared-types';
import { type Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import {
  EMAIL_PROVIDER,
  type EmailProvider,
  FIREBASE_AUTH_PROVIDER,
  type FirebaseAuthProvider,
  InvalidFirebaseTokenError,
  type VerifiedFirebaseIdentity,
} from '../../../core/providers';
import { REDIS } from '../../../core/redis';
import { type DeviceInfoDto } from '../dto/auth.dto';
import { OtpService } from './otp.service';
import { PasswordService } from './password.service';
import { newOpaqueToken, sha256 } from './secrets';
import { type ClientContext, TokenService } from './token.service';
import { UsersService } from './users.service';

const RESET_TTL_SECONDS = 1800;
const resetKey = (tokenHash: string) => `auth:pwreset:${tokenHash}`;

export type AuthResultWithDevice = AuthResult & { deviceId: string | null };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly passwords: PasswordService,
    private readonly otp: OtpService,
    @Inject(FIREBASE_AUTH_PROVIDER) private readonly firebase: FirebaseAuthProvider,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  // ───────────── Mobile: Firebase ID token → our tokens ─────────────

  async exchangeFirebaseToken(
    idToken: string,
    device: DeviceInfoDto | undefined,
    ctx: ClientContext,
  ): Promise<AuthResultWithDevice> {
    let identity: VerifiedFirebaseIdentity;
    try {
      identity = await this.firebase.verifyIdToken(idToken);
    } catch (err) {
      if (err instanceof InvalidFirebaseTokenError) {
        throw AppException.unauthorized(
          ERROR_CODES.AUTH_INVALID_FIREBASE_TOKEN,
          'Firebase token is invalid',
        );
      }
      throw err;
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await this.upsertFirebaseUser(tx, identity);
      if (user.status !== 'active') {
        throw AppException.unauthorized(
          ERROR_CODES.AUTH_ACCOUNT_SUSPENDED,
          'Account is not active',
        );
      }
      const deviceId = device ? await this.upsertDevice(tx, user.id, device) : null;
      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      const loaded = await this.users.findWithRoles(user.id, tx);
      if (!loaded) throw AppException.unauthorized();
      const pair = await this.tokens.issuePair(loaded.auth, { ...ctx, deviceId }, tx);
      return { ...pair, user: loaded.auth, deviceId };
    });
  }

  /**
   * Find the user for a Firebase identity. Links an existing account by verified phone or
   * verified email when it has no Firebase uid yet; upgrades a guest in place when the same
   * uid comes back with a real credential.
   */
  private async upsertFirebaseUser(
    tx: Prisma.TransactionClient,
    id: VerifiedFirebaseIdentity,
  ): Promise<User> {
    const verifiedEmail = id.emailVerified ? id.email : null;
    const existing = await tx.user.findUnique({ where: { firebaseUid: id.uid } });

    if (existing) {
      const data: Prisma.UserUpdateInput = {};
      if (existing.isGuest && !id.isAnonymous) data.isGuest = false;
      if (id.phoneE164 && existing.phoneE164 !== id.phoneE164) data.phoneE164 = id.phoneE164;
      if (verifiedEmail && !existing.email) data.email = verifiedEmail;
      if (Object.keys(data).length === 0) return existing;
      try {
        return await tx.user.update({ where: { id: existing.id }, data });
      } catch (err) {
        throw this.mapIdentifierConflict(err);
      }
    }

    const linkCandidates: Prisma.UserWhereInput[] = [];
    if (id.phoneE164) linkCandidates.push({ phoneE164: id.phoneE164 });
    if (verifiedEmail) linkCandidates.push({ email: verifiedEmail });
    if (linkCandidates.length > 0) {
      const matches = await tx.user.findMany({ where: { OR: linkCandidates } });
      if (matches.length > 1) {
        throw AppException.conflict(
          'Phone and email belong to different accounts; contact support',
        );
      }
      const match = matches[0];
      if (match) {
        if (match.firebaseUid)
          throw AppException.conflict('This phone or email is linked to another sign-in');
        return tx.user.update({
          where: { id: match.id },
          data: {
            firebaseUid: id.uid,
            isGuest: false,
            ...(id.phoneE164 ? { phoneE164: id.phoneE164 } : {}),
            ...(verifiedEmail && !match.email ? { email: verifiedEmail } : {}),
          },
        });
      }
    }

    const created = await tx.user.create({
      data: {
        firebaseUid: id.uid,
        phoneE164: id.phoneE164,
        email: verifiedEmail,
        isGuest: id.isAnonymous,
        profile: { create: { displayName: id.displayName } },
      },
    });
    await this.users.grantRole(tx, created.id, 'user');
    return created;
  }

  private mapIdentifierConflict(err: unknown): unknown {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return AppException.conflict('This phone or email is already used by another account');
    }
    return err;
  }

  private async upsertDevice(
    tx: Prisma.TransactionClient,
    userId: string,
    d: DeviceInfoDto,
  ): Promise<string> {
    const fields = {
      platform: d.platform,
      appVersion: d.appVersion ?? null,
      locale: d.locale ?? null,
      lastSeenAt: new Date(),
    };
    if (d.deviceId) {
      const own = await tx.device.findFirst({ where: { id: d.deviceId, userId } });
      if (own) {
        if (d.fcmToken && d.fcmToken !== own.fcmToken) {
          // An FCM token identifies one app install; detach it from any other device row.
          await tx.device.updateMany({
            where: { fcmToken: d.fcmToken, NOT: { id: own.id } },
            data: { fcmToken: null },
          });
        }
        await tx.device.update({
          where: { id: own.id },
          data: { ...fields, ...(d.fcmToken ? { fcmToken: d.fcmToken } : {}) },
        });
        return own.id;
      }
    }
    if (d.fcmToken) {
      // Shared phones: the token moves to whoever signed in last.
      const device = await tx.device.upsert({
        where: { fcmToken: d.fcmToken },
        create: { userId, fcmToken: d.fcmToken, ...fields },
        update: { userId, ...fields },
      });
      return device.id;
    }
    const device = await tx.device.create({ data: { userId, ...fields } });
    return device.id;
  }

  // ───────────── Portals: email + password (+ optional OTP) ─────────────

  async portalLogin(
    email: string,
    password: string,
    ctx: ClientContext,
  ): Promise<AuthResultWithDevice | OtpChallenge> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    const ok = user?.passwordHash
      ? await this.passwords.verify(user.passwordHash, password)
      : await this.passwords.verifyAgainstDummy(password);
    if (!user || !ok) {
      throw AppException.unauthorized(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Email or password is incorrect',
      );
    }
    if (user.status !== 'active') {
      throw AppException.unauthorized(ERROR_CODES.AUTH_ACCOUNT_SUSPENDED, 'Account is not active');
    }
    if (user.mfaEnabled && user.email) return this.otp.createChallenge(user.id, user.email);
    return this.completeLogin(user.id, ctx);
  }

  async verifyPortalOtp(
    challengeId: string,
    code: string,
    ctx: ClientContext,
  ): Promise<AuthResultWithDevice> {
    const userId = await this.otp.verify(challengeId, code);
    return this.completeLogin(userId, ctx);
  }

  private async completeLogin(userId: string, ctx: ClientContext): Promise<AuthResultWithDevice> {
    return this.prisma.$transaction(async (tx) => {
      const loaded = await this.users.findWithRoles(userId, tx);
      if (!loaded || loaded.status !== 'active') {
        throw AppException.unauthorized(
          ERROR_CODES.AUTH_ACCOUNT_SUSPENDED,
          'Account is not active',
        );
      }
      await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
      const pair = await this.tokens.issuePair(loaded.auth, ctx, tx);
      return { ...pair, user: loaded.auth, deviceId: null };
    });
  }

  // ───────────── Sessions ─────────────

  async refresh(refreshToken: string, ctx: ClientContext): Promise<AuthResultWithDevice> {
    const { pair, user } = await this.tokens.rotate(refreshToken, ctx);
    return { ...pair, user, deviceId: null };
  }

  async logout(userId: string, sessionId: string, allSessions: boolean): Promise<void> {
    if (allSessions) await this.tokens.revokeAllForUser(userId);
    else await this.tokens.revokeFamily(sessionId, userId);
  }

  async me(userId: string): Promise<AuthUser> {
    const loaded = await this.users.findWithRoles(userId);
    if (!loaded || loaded.status === 'deleted') throw AppException.notFound('User not found');
    return loaded.auth;
  }

  // ───────────── Password reset (portals) ─────────────

  /** Always succeeds from the caller's view so emails cannot be enumerated. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmailWithRoles(email);
    if (!user?.passwordHash || !user.email || user.status !== 'active') return;

    const token = newOpaqueToken();
    await this.redis.set(resetKey(sha256(token)), user.id, 'EX', RESET_TTL_SECONDS);
    const isAdmin = user.auth.roles.some((r) => ADMIN_ROLES.includes(r));
    const base = isAdmin ? this.config.portals.adminUrl : this.config.portals.vendorUrl;
    const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
    await this.email.send({
      to: user.email,
      tag: 'password_reset',
      subject: 'Reset your Tirth Now password',
      text: `Use this link within 30 minutes to reset your password:\n\n${link}\n\nIf you did not ask for this, ignore this email.`,
    });
    this.logger.log({ userId: user.id }, 'password reset requested');
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const k = resetKey(sha256(token));
    const userId = await this.redis.get(k);
    if (!userId || (await this.redis.del(k)) !== 1) {
      throw new AppException(
        ERROR_CODES.AUTH_RESET_TOKEN_INVALID,
        HttpStatus.BAD_REQUEST,
        'Reset link is invalid or has expired',
      );
    }
    const passwordHash = await this.passwords.hash(password);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await this.tokens.revokeAllForUser(userId, tx);
    });
  }
}
