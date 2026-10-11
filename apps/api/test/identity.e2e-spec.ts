import { MediaProcessor } from '../src/modules/files';
import { pngBytes, seedCatalog } from './fixtures';
import {
  bearer,
  createTestApp,
  drainQueue,
  resetState,
  signInMobile,
  type TestApp,
  uploadFile,
} from './helpers';

describe('identity: profile, devices, emergency contacts', () => {
  let t: TestApp;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetState(t);
    ({ token, userId } = await signInMobile(t, 'yatri', '+919811100000'));
  });
  afterAll(async () => {
    await t.close();
  });

  it('reads and partially updates the profile', async () => {
    const fx = await seedCatalog(t.prisma);
    const res = await t.http
      .patch('/v1/me/profile')
      .set(...bearer(token))
      .send({
        displayName: 'Radha',
        preferredLang: 'hi',
        homeCityId: fx.vrindavan,
        accessibility: { wheelchair: true },
      })
      .expect(200);
    expect(res.body).toMatchObject({
      displayName: 'Radha',
      preferredLang: 'hi',
      homeCityId: fx.vrindavan,
      accessibility: { wheelchair: true },
      roles: ['user'],
    });

    const merged = await t.http
      .patch('/v1/me/profile')
      .set(...bearer(token))
      .send({ accessibility: { elderly: true } })
      .expect(200);
    expect(merged.body.accessibility).toEqual({ wheelchair: true, elderly: true });

    await t.http
      .patch('/v1/me/profile')
      .set(...bearer(token))
      .send({ preferredLang: 'fr' })
      .expect(400);
    const badCity = await t.http
      .patch('/v1/me/profile')
      .set(...bearer(token))
      .send({ homeCityId: '00000000-0000-4000-8000-000000000000' })
      .expect(400);
    expect(badCity.body.error.message).toMatch(/referenced/);
  });

  it('sets an avatar only from a ready avatar upload owned by the user', async () => {
    const { mediaId } = await uploadFile(t, token, {
      purpose: 'avatar',
      mimeType: 'image/png',
      body: await pngBytes(400, 400),
    });
    await t.http
      .patch('/v1/me/profile')
      .set(...bearer(token))
      .send({ avatarMediaId: mediaId })
      .expect(400);
    await drainQueue(t, 'media', MediaProcessor);
    const res = await t.http
      .patch('/v1/me/profile')
      .set(...bearer(token))
      .send({ avatarMediaId: mediaId })
      .expect(200);
    expect(res.body.avatarUrl).toMatch(/thumb\.webp$/);

    const other = await signInMobile(t, 'thief');
    await t.http
      .patch('/v1/me/profile')
      .set(...bearer(other.token))
      .send({ avatarMediaId: mediaId })
      .expect(400);
  });

  it('registers, lists and removes devices', async () => {
    const reg = await t.http
      .post('/v1/me/devices')
      .set(...bearer(token))
      .send({ platform: 'android', fcmToken: 'fcm-abc', appVersion: '1.0.0' })
      .expect(200);
    expect(reg.body).toMatchObject({ platform: 'android', hasPushToken: true });
    const again = await t.http
      .post('/v1/me/devices')
      .set(...bearer(token))
      .send({ deviceId: reg.body.id, platform: 'android', appVersion: '1.0.1' })
      .expect(200);
    expect(again.body.id).toBe(reg.body.id);
    const list = await t.http
      .get('/v1/me/devices')
      .set(...bearer(token))
      .expect(200);
    expect(list.body).toHaveLength(1);
    await t.http
      .delete(`/v1/me/devices/${reg.body.id as string}`)
      .set(...bearer(token))
      .expect(204);
    await t.http
      .delete(`/v1/me/devices/${reg.body.id as string}`)
      .set(...bearer(token))
      .expect(404);
  });

  it('manages up to five emergency contacts', async () => {
    const add = (i: number) =>
      t.http
        .post('/v1/me/emergency-contacts')
        .set(...bearer(token))
        .send({ name: `Contact ${i}`, phoneE164: `+91980000000${i}`, relation: 'family' });
    for (let i = 0; i < 5; i++) await add(i).expect(201);
    const sixth = await add(6).expect(409);
    expect(sixth.body.error.message).toMatch(/up to 5/);

    const dup = await t.http
      .post('/v1/me/emergency-contacts')
      .set(...bearer(token))
      .send({ name: 'Dup', phoneE164: '+919800000000' });
    expect(dup.status).toBe(409);

    const list = await t.http
      .get('/v1/me/emergency-contacts')
      .set(...bearer(token))
      .expect(200);
    expect(list.body).toHaveLength(5);
    const id = list.body[0].id as string;
    const upd = await t.http
      .patch(`/v1/me/emergency-contacts/${id}`)
      .set(...bearer(token))
      .send({ priority: 9 })
      .expect(200);
    expect(upd.body.priority).toBe(9);
    await t.http
      .delete(`/v1/me/emergency-contacts/${id}`)
      .set(...bearer(token))
      .expect(204);

    await t.http
      .post('/v1/me/emergency-contacts')
      .set(...bearer(token))
      .send({ name: 'Bad', phoneE164: '98765' })
      .expect(400);
  });

  it('keeps emergency contacts away from guests and other users', async () => {
    const guest = await t.http.post('/v1/auth/firebase').send({ idToken: 'mock:guest:guest-1' });
    await t.http
      .get('/v1/me/emergency-contacts')
      .set(...bearer(guest.body.accessToken as string))
      .expect(403);

    const created = await t.http
      .post('/v1/me/emergency-contacts')
      .set(...bearer(token))
      .send({ name: 'Mine', phoneE164: '+919800000099' })
      .expect(201);
    const other = await signInMobile(t, 'other-user');
    await t.http
      .patch(`/v1/me/emergency-contacts/${created.body.id as string}`)
      .set(...bearer(other.token))
      .send({ name: 'x' })
      .expect(404);
  });

  it('deletes the account, scrubbing personal data and sessions', async () => {
    await t.http
      .post('/v1/me/emergency-contacts')
      .set(...bearer(token))
      .send({ name: 'Mom', phoneE164: '+919800000098' })
      .expect(201);
    await t.http
      .delete('/v1/me')
      .set(...bearer(token))
      .expect(204);
    const user = await t.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user).toMatchObject({
      status: 'deleted',
      phoneE164: null,
      firebaseUid: null,
      email: null,
    });
    expect(await t.prisma.emergencyContact.count({ where: { userId } })).toBe(0);
    expect(await t.prisma.refreshToken.count({ where: { userId, revokedAt: null } })).toBe(0);
    expect(
      await t.prisma.auditLog.count({ where: { action: 'user.self_delete', entityId: userId } }),
    ).toBe(1);

    // The same phone can sign up again as a fresh account.
    const again = await signInMobile(t, 'yatri', '+919811100000');
    expect(again.userId).not.toBe(userId);
  });
});
