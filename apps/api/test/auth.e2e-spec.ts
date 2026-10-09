import { Controller, Get } from '@nestjs/common';
import { type AuthPrincipal, CurrentUser, NoGuests, Roles } from '../src/core/auth';
import {
  codeFromEmail,
  createPortalUser,
  createTestApp,
  resetState,
  type TestApp,
  tokenFromResetEmail,
} from './helpers';

@Controller('rbac-probe')
class RbacProbeController {
  @Get('admin')
  @Roles('admin')
  admin(@CurrentUser() user: AuthPrincipal): { userId: string } {
    return { userId: user.userId };
  }

  @Get('members')
  @NoGuests()
  members(): { ok: true } {
    return { ok: true };
  }
}

interface AuthBody {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  deviceId: string | null;
  user: {
    id: string;
    roles: string[];
    isGuest: boolean;
    phoneE164: string | null;
    email: string | null;
  };
}

describe('auth', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ controllers: [RbacProbeController] });
  });
  beforeEach(async () => {
    await resetState(t);
  });
  afterAll(async () => {
    await t.close();
  });

  const firebase = async (
    idToken: string,
    device?: Record<string, unknown>,
  ): Promise<{ status: number; body: AuthBody }> => {
    const res = await t.http
      .post('/v1/auth/firebase')
      .send({ idToken, ...(device ? { device } : {}) });
    return { status: res.status, body: res.body as AuthBody };
  };

  describe('POST /v1/auth/firebase', () => {
    it('creates a user with the user role and returns a token pair', async () => {
      const res = await firebase('mock:pilgrim-1:+919812345678', {
        platform: 'android',
        fcmToken: 'fcm-1',
        locale: 'hi-IN',
      });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        phoneE164: '+919812345678',
        isGuest: false,
        roles: ['user'],
      });
      expect(res.body.deviceId).toEqual(expect.any(String));
      expect(new Date(res.body.accessTokenExpiresAt).getTime() - Date.now()).toBeLessThanOrEqual(
        15 * 60_000,
      );
      expect(new Date(res.body.refreshTokenExpiresAt).getTime() - Date.now()).toBeGreaterThan(
        29 * 86_400_000,
      );

      const stored = await t.prisma.refreshToken.findFirstOrThrow({
        where: { userId: res.body.user.id },
      });
      expect(stored.tokenHash).not.toBe(res.body.refreshToken);
      expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);

      const me = await t.http
        .get('/v1/me')
        .set('authorization', `Bearer ${res.body.accessToken}`)
        .expect(200);
      expect(me.body).toMatchObject({ id: res.body.user.id, roles: ['user'] });
    });

    it('returns the same user on repeat sign-in and moves the FCM token', async () => {
      const a = await firebase('mock:pilgrim-2:+919800000001', {
        platform: 'ios',
        fcmToken: 'shared-fcm',
      });
      const b = await firebase('mock:pilgrim-2:+919800000001');
      expect(b.body.user.id).toBe(a.body.user.id);

      const other = await firebase('mock:pilgrim-3:+919800000002', {
        platform: 'ios',
        fcmToken: 'shared-fcm',
      });
      const device = await t.prisma.device.findUniqueOrThrow({ where: { fcmToken: 'shared-fcm' } });
      expect(device.userId).toBe(other.body.user.id);
    });

    it('upgrades a guest in place when the same uid signs in with a phone', async () => {
      const guest = await firebase('mock:guest:anon-1');
      expect(guest.body.user.isGuest).toBe(true);
      await t.http
        .get('/v1/rbac-probe/members')
        .set('authorization', `Bearer ${guest.body.accessToken}`)
        .expect(403);

      const upgraded = await firebase('mock:anon-1:+919811111111');
      expect(upgraded.body.user).toMatchObject({
        id: guest.body.user.id,
        isGuest: false,
        phoneE164: '+919811111111',
      });
      await t.http
        .get('/v1/rbac-probe/members')
        .set('authorization', `Bearer ${upgraded.body.accessToken}`)
        .expect(200);
    });

    it('links an existing account by verified phone', async () => {
      const existing = await t.prisma.user.create({ data: { phoneE164: '+919822222222' } });
      const res = await firebase('mock:new-uid:+919822222222');
      expect(res.body.user.id).toBe(existing.id);
      const linked = await t.prisma.user.findUniqueOrThrow({ where: { id: existing.id } });
      expect(linked.firebaseUid).toBe('new-uid');
    });

    it('rejects invalid Firebase tokens', async () => {
      const res = await t.http
        .post('/v1/auth/firebase')
        .send({ idToken: 'not-a-real-token' })
        .expect(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_FIREBASE_TOKEN');
    });

    it('rejects suspended accounts', async () => {
      await t.prisma.user.create({ data: { firebaseUid: 'banned', status: 'suspended' } });
      const res = await t.http
        .post('/v1/auth/firebase')
        .send({ idToken: 'mock:banned' })
        .expect(401);
      expect(res.body.error.code).toBe('AUTH_ACCOUNT_SUSPENDED');
    });

    it('validates the body', async () => {
      const res = await t.http
        .post('/v1/auth/firebase')
        .send({ idToken: 'mock:x-1', device: { platform: 'symbian' }, extra: true })
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      const fields = (res.body.error.details as { field: string }[]).map((d) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['extra', 'device.platform']));
    });
  });

  describe('refresh rotation', () => {
    it('rotates tokens and keeps the session id', async () => {
      const first = await firebase('mock:rot-1:+919833333333');
      const second = await t.http
        .post('/v1/auth/refresh')
        .send({ refreshToken: first.body.refreshToken })
        .expect(200);
      expect(second.body.refreshToken).not.toBe(first.body.refreshToken);
      await t.http
        .get('/v1/me')
        .set('authorization', `Bearer ${second.body.accessToken as string}`)
        .expect(200);

      const tokens = await t.prisma.refreshToken.findMany({
        where: { userId: first.body.user.id },
      });
      expect(tokens).toHaveLength(2);
      expect(new Set(tokens.map((x) => x.familyId)).size).toBe(1);
    });

    it('revokes the whole family when an old token is reused', async () => {
      const first = await firebase('mock:rot-2:+919844444444');
      const second = await t.http
        .post('/v1/auth/refresh')
        .send({ refreshToken: first.body.refreshToken })
        .expect(200);

      const reuse = await t.http
        .post('/v1/auth/refresh')
        .send({ refreshToken: first.body.refreshToken })
        .expect(401);
      expect(reuse.body.error.code).toBe('AUTH_REFRESH_REUSED');

      const stolen = await t.http
        .post('/v1/auth/refresh')
        .send({ refreshToken: second.body.refreshToken })
        .expect(401);
      expect(stolen.body.error.code).toBe('AUTH_REFRESH_INVALID');
    });

    it('lets only one of two concurrent rotations win', async () => {
      const first = await firebase('mock:rot-3:+919855555555');
      const results = await Promise.all([
        t.http.post('/v1/auth/refresh').send({ refreshToken: first.body.refreshToken }),
        t.http.post('/v1/auth/refresh').send({ refreshToken: first.body.refreshToken }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
    });

    it('rejects unknown and expired refresh tokens', async () => {
      const unknown = await t.http
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'x'.repeat(43) })
        .expect(401);
      expect(unknown.body.error.code).toBe('AUTH_REFRESH_INVALID');

      const first = await firebase('mock:rot-4:+919866666666');
      await t.prisma.refreshToken.updateMany({
        where: { userId: first.body.user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await t.http
        .post('/v1/auth/refresh')
        .send({ refreshToken: first.body.refreshToken })
        .expect(401);
    });

    it('stops refreshing once the account is suspended', async () => {
      const first = await firebase('mock:rot-5:+919877777777');
      await t.prisma.user.update({
        where: { id: first.body.user.id },
        data: { status: 'suspended' },
      });
      const res = await t.http
        .post('/v1/auth/refresh')
        .send({ refreshToken: first.body.refreshToken })
        .expect(401);
      expect(res.body.error.code).toBe('AUTH_ACCOUNT_SUSPENDED');
    });
  });

  describe('logout', () => {
    it('revokes the current session only', async () => {
      const phone = await firebase('mock:lo-1:+919888888888');
      const tablet = await firebase('mock:lo-1:+919888888888');
      await t.http
        .post('/v1/auth/logout')
        .set('authorization', `Bearer ${phone.body.accessToken}`)
        .send({})
        .expect(204);

      await t.http
        .post('/v1/auth/refresh')
        .send({ refreshToken: phone.body.refreshToken })
        .expect(401);
      await t.http
        .post('/v1/auth/refresh')
        .send({ refreshToken: tablet.body.refreshToken })
        .expect(200);
    });

    it('revokes every session with allSessions', async () => {
      const a = await firebase('mock:lo-2:+919899999999');
      const b = await firebase('mock:lo-2:+919899999999');
      await t.http
        .post('/v1/auth/logout')
        .set('authorization', `Bearer ${a.body.accessToken}`)
        .send({ allSessions: true })
        .expect(204);
      await t.http.post('/v1/auth/refresh').send({ refreshToken: b.body.refreshToken }).expect(401);
    });

    it('requires authentication', async () => {
      await t.http.post('/v1/auth/logout').send({}).expect(401);
    });
  });

  describe('portal login', () => {
    it('logs in with email and password and carries roles in the token', async () => {
      await createPortalUser(t, {
        email: 'ops@tirthnow.test',
        password: 'Correct-horse-1',
        roles: ['user', 'super_admin'],
      });
      const res = await t.http
        .post('/v1/auth/portal/login')
        .send({ email: 'OPS@tirthnow.test', password: 'Correct-horse-1' })
        .expect(200);
      expect((res.body as AuthBody).user.roles).toEqual(['super_admin', 'user']);

      await t.http
        .get('/v1/rbac-probe/admin')
        .set('authorization', `Bearer ${(res.body as AuthBody).accessToken}`)
        .expect(200);
    });

    it('rejects wrong passwords and unknown emails the same way', async () => {
      await createPortalUser(t, { email: 'v@tirthnow.test', password: 'Correct-horse-1' });
      const wrong = await t.http
        .post('/v1/auth/portal/login')
        .send({ email: 'v@tirthnow.test', password: 'nope' })
        .expect(401);
      const unknown = await t.http
        .post('/v1/auth/portal/login')
        .send({ email: 'x@tirthnow.test', password: 'nope' })
        .expect(401);
      expect(wrong.body.error).toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
      expect(unknown.body.error.message).toBe(wrong.body.error.message);
    });

    it('rejects suspended portal users', async () => {
      await createPortalUser(t, {
        email: 's@tirthnow.test',
        password: 'Correct-horse-1',
        status: 'suspended',
      });
      const res = await t.http
        .post('/v1/auth/portal/login')
        .send({ email: 's@tirthnow.test', password: 'Correct-horse-1' })
        .expect(401);
      expect(res.body.error.code).toBe('AUTH_ACCOUNT_SUSPENDED');
    });

    it('forbids non-admins from admin routes', async () => {
      await createPortalUser(t, {
        email: 'plain@tirthnow.test',
        password: 'Correct-horse-1',
        roles: ['vendor_owner'],
      });
      const login = await t.http
        .post('/v1/auth/portal/login')
        .send({ email: 'plain@tirthnow.test', password: 'Correct-horse-1' });
      const res = await t.http
        .get('/v1/rbac-probe/admin')
        .set('authorization', `Bearer ${(login.body as AuthBody).accessToken}`)
        .expect(403);
      expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
    });
  });

  describe('portal OTP', () => {
    beforeEach(async () => {
      await createPortalUser(t, {
        email: 'mfa@tirthnow.test',
        password: 'Correct-horse-1',
        roles: ['admin'],
        mfa: true,
      });
    });

    const startLogin = async (): Promise<string> => {
      const res = await t.http
        .post('/v1/auth/portal/login')
        .send({ email: 'mfa@tirthnow.test', password: 'Correct-horse-1' })
        .expect(200);
      expect(res.body).toMatchObject({ otpRequired: true, channel: 'email' });
      expect(res.body.accessToken).toBeUndefined();
      return res.body.challengeId as string;
    };

    it('requires the emailed code and is single use', async () => {
      const challengeId = await startLogin();
      const mail = t.email.lastTo('mfa@tirthnow.test');
      expect(mail?.tag).toBe('portal_otp');
      const code = codeFromEmail(mail?.text ?? '');

      const ok = await t.http
        .post('/v1/auth/portal/otp/verify')
        .send({ challengeId, code })
        .expect(200);
      expect((ok.body as AuthBody).user.roles).toContain('admin');

      const again = await t.http
        .post('/v1/auth/portal/otp/verify')
        .send({ challengeId, code })
        .expect(401);
      expect(again.body.error.code).toBe('AUTH_OTP_EXPIRED');
    });

    it('locks the challenge after five wrong codes', async () => {
      const challengeId = await startLogin();
      const code = codeFromEmail(t.email.lastTo('mfa@tirthnow.test')?.text ?? '');
      const wrong = code === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) {
        const r = await t.http
          .post('/v1/auth/portal/otp/verify')
          .send({ challengeId, code: wrong })
          .expect(401);
        expect(r.body.error.code).toBe('AUTH_OTP_INVALID');
      }
      const res = await t.http
        .post('/v1/auth/portal/otp/verify')
        .send({ challengeId, code })
        .expect(401);
      expect(res.body.error.code).toBe('AUTH_OTP_EXPIRED');
    });
  });

  describe('password reset', () => {
    it('resets the password once and signs out every session', async () => {
      await createPortalUser(t, {
        email: 'reset@tirthnow.test',
        password: 'Old-password-1',
        roles: ['vendor_owner'],
      });
      const login = await t.http
        .post('/v1/auth/portal/login')
        .send({ email: 'reset@tirthnow.test', password: 'Old-password-1' })
        .expect(200);

      await t.http
        .post('/v1/auth/portal/password/forgot')
        .send({ email: 'reset@tirthnow.test' })
        .expect(202);
      const mail = t.email.lastTo('reset@tirthnow.test');
      expect(mail?.text).toContain('http://localhost:3001/reset-password?token=');
      const token = tokenFromResetEmail(mail?.text ?? '');

      const weak = await t.http
        .post('/v1/auth/portal/password/reset')
        .send({ token, password: 'short' })
        .expect(400);
      expect(weak.body.error.code).toBe('VALIDATION_FAILED');

      await t.http
        .post('/v1/auth/portal/password/reset')
        .send({ token, password: 'New-password-2' })
        .expect(204);
      const reused = await t.http
        .post('/v1/auth/portal/password/reset')
        .send({ token, password: 'New-password-3' })
        .expect(400);
      expect(reused.body.error.code).toBe('AUTH_RESET_TOKEN_INVALID');

      await t.http
        .post('/v1/auth/refresh')
        .send({ refreshToken: (login.body as AuthBody).refreshToken })
        .expect(401);
      await t.http
        .post('/v1/auth/portal/login')
        .send({ email: 'reset@tirthnow.test', password: 'Old-password-1' })
        .expect(401);
      await t.http
        .post('/v1/auth/portal/login')
        .send({ email: 'reset@tirthnow.test', password: 'New-password-2' })
        .expect(200);
    });

    it('accepts unknown emails without sending anything', async () => {
      await t.http
        .post('/v1/auth/portal/password/forgot')
        .send({ email: 'ghost@tirthnow.test' })
        .expect(202);
      expect(t.email.outbox).toHaveLength(0);
    });
  });

  describe('access token checks', () => {
    it('rejects tampered and malformed tokens', async () => {
      const res = await firebase('mock:tok-1:+919800011111');
      const [h, p] = res.body.accessToken.split('.');
      await t.http.get('/v1/me').set('authorization', `Bearer ${h}.${p}.invalidsig`).expect(401);
      await t.http.get('/v1/me').set('authorization', 'Basic abc').expect(401);
    });
  });
});

describe('auth rate limiting', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ env: { THROTTLE_AUTH_PER_MIN: '3' } });
    await resetState(t);
  });
  afterAll(async () => {
    await t.close();
  });

  it('returns RATE_LIMITED after the auth bucket is exhausted, without touching other routes', async () => {
    for (let i = 0; i < 3; i++) {
      await t.http.post('/v1/auth/firebase').send({ idToken: 'bad-token' }).expect(401);
    }
    const limited = await t.http
      .post('/v1/auth/firebase')
      .send({ idToken: 'bad-token' })
      .expect(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect(limited.headers['retry-after-auth']).toBeDefined();
    await t.http.get('/healthz').expect(200);
  });
});
