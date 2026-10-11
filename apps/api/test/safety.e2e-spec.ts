import { type Socket } from 'socket.io-client';
import { MockPushAdapter, MockSmsAdapter, MockWhatsAppAdapter } from '../src/core/providers';
import { SosProcessor } from '../src/modules/safety';
import { NotificationsProcessor } from '../src/modules/notifications';
import { seedCatalog } from './fixtures';
import {
  adminToken,
  bearer,
  collectEvents,
  connectSocket,
  createTestApp,
  drainQueue,
  nextEvent,
  resetState,
  signInMobile,
  subscribeRoom,
  type TestApp,
} from './helpers';

let seq = 0;
const key = () => `sos-key-${Date.now()}-${++seq}`;

describe('safety: SOS', () => {
  let t: TestApp;
  let user: { token: string; userId: string };
  let sms: MockSmsAdapter;
  let wa: MockWhatsAppAdapter;
  let push: MockPushAdapter;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    t = await createTestApp({ env: { SOS_MAX_PER_10_MIN: '2' } });
    sms = t.app.get(MockSmsAdapter);
    wa = t.app.get(MockWhatsAppAdapter);
    push = t.app.get(MockPushAdapter);
  });
  beforeEach(async () => {
    await resetState(t);
    await seedCatalog(t.prisma);
    user = await signInMobile(t, 'yatri-sos', '+919811100001');
    await t.http
      .patch('/v1/me/profile')
      .set(...bearer(user.token))
      .send({ displayName: 'Radha Sharma' })
      .expect(200);
  });
  afterEach(() => {
    for (const s of sockets.splice(0)) s.disconnect();
  });
  afterAll(async () => {
    await t.close();
  });

  const at = { lat: 27.5806, lng: 77.6996, accuracyM: 15, batteryPct: 40 };
  const trigger = (k = key(), token = user.token, body: object = at) =>
    t.http
      .post('/v1/safety/sos')
      .set(...bearer(token))
      .set('Idempotency-Key', k)
      .send(body);

  async function contacts() {
    // The second contact also uses the app and has a device registered.
    const sister = await signInMobile(t, 'sister', '+919811100003');
    await t.http
      .post('/v1/me/devices')
      .set(...bearer(sister.token))
      .send({ platform: 'android', fcmToken: 'fcm-sister' })
      .expect(200);
    await t.http
      .post('/v1/me/emergency-contacts')
      .set(...bearer(user.token))
      .send({ name: 'Papa', phoneE164: '+919811100002', notifyWhatsapp: false })
      .expect(201);
    await t.http
      .post('/v1/me/emergency-contacts')
      .set(...bearer(user.token))
      .send({ name: 'Didi', phoneE164: '+919811100003' })
      .expect(201);
  }

  it('alerts contacts by SMS, WhatsApp and push, shares live location, and tells them when it is over', async () => {
    await contacts();
    const admin = await adminToken(t);
    const adminSocket = await connectSocket(t, admin);
    sockets.push(adminSocket);
    expect(await subscribeRoom(adminSocket, 'admin')).toEqual({ ok: true, room: 'admin' });
    const sosNew = nextEvent<{ sosId: string; status: string }>(adminSocket, 'sos.new');

    const k = key();
    const res = await trigger(k).expect(202);
    expect(res.body).toMatchObject({ status: 'triggered', lat: at.lat, contactsNotified: 0 });
    expect(res.body.shareUrl).toMatch(/^http:\/\/localhost:4000\/s\/[A-Za-z0-9_-]{22}$/);
    expect(res.body.cancellableForS).toBeGreaterThan(100);
    expect(res.body.nearestHelp.map((p: { category: string }) => p.category).sort()).toEqual([
      'hospital',
      'police',
    ]);
    expect(res.body.helplines).toContainEqual(expect.objectContaining({ phone: '112' }));
    expect((await sosNew).sosId).toBe(res.body.id);

    // Replays return the same event; a second press while active returns it too.
    expect((await trigger(k).expect(202)).body.id).toBe(res.body.id);
    expect((await trigger().expect(202)).body.id).toBe(res.body.id);
    expect(await t.prisma.sosEvent.count()).toBe(1);

    expect(await drainQueue(t, 'sos', SosProcessor)).toEqual(['dispatched']);
    expect(sms.outbox.map((m) => m.to).sort()).toEqual(['+919811100002', '+919811100003']);
    const alert = sms.to('+919811100002')[0];
    expect(alert?.text).toContain('Radha Sharma triggered an SOS');
    expect(alert?.text).toContain(res.body.shareUrl);
    expect(alert?.text).toContain('Kotwali Police Station');
    expect(wa.outbox.map((m) => [m.to, m.templateName, m.params[0]])).toEqual([
      ['+919811100003', 'sos_alert', 'Radha Sharma'],
    ]);
    expect(push.to('fcm-sister')).toHaveLength(1);
    expect(push.to('fcm-sister')[0]).toMatchObject({
      priority: 'high',
      channel: 'sos',
      data: { type: 'sos' },
    });

    const token = (res.body.shareUrl as string).split('/s/')[1] ?? '';
    const viewer = await connectSocket(t);
    sockets.push(viewer);
    expect(await subscribeRoom(viewer, `sos:${token}`)).toEqual({ ok: true, room: `sos:${token}` });
    const moved = nextEvent<{ lat: number }>(viewer, 'sos.location');
    await t.http
      .post(`/v1/safety/sos/${res.body.id as string}/location`)
      .set(...bearer(user.token))
      .send({ lat: 27.5811, lng: 77.7001, batteryPct: 35 })
      .expect(200);
    expect((await moved).lat).toBe(27.5811);

    const shared = await t.http.get(`/s/${token}`).expect(200);
    expect(shared.body).toMatchObject({
      name: 'Radha',
      state: 'active',
      lat: 27.5811,
      batteryPct: 35,
    });
    // Initial point, the second press (the replay adds nothing), the live update.
    expect(shared.body.trail).toHaveLength(3);
    const html = await t.http.get(`/s/${token}`).set('accept', 'text/html').expect(200);
    expect(html.text).toContain('Radha has asked for help');
    expect(html.text).toContain('query=27.5811,77.7001');
    await t.http.get('/s/not-a-real-token-xxxxxxxx').expect(404);

    const mine = await t.http
      .get(`/v1/safety/sos/${res.body.id as string}`)
      .set(...bearer(user.token))
      .expect(200);
    expect(mine.body).toMatchObject({ status: 'dispatched', contactsNotified: 2 });

    const closed = nextEvent<{ status: string }>(viewer, 'sos.status');
    await t.http
      .post(`/v1/safety/sos/${res.body.id as string}/resolve`)
      .set(...bearer(user.token))
      .send({ note: 'Found my group' })
      .expect(200);
    expect((await closed).status).toBe('resolved');
    expect(await drainQueue(t, 'sos', SosProcessor)).toEqual(['notified']);
    expect(sms.to('+919811100002').map((m) => m.tag)).toEqual(['sos_alert', 'sos_resolved']);
    expect((await t.http.get(`/s/${token}`).expect(200)).body).toMatchObject({
      state: 'ended',
      lat: null,
      trail: [],
    });
    expect((await subscribeRoom(await connectSocket(t), `sos:${token}`)).ok).toBe(false);

    const board = await t.http
      .get('/v1/admin/sos')
      .set(...bearer(admin))
      .expect(200);
    expect(board.body.data[0]).toMatchObject({
      id: res.body.id,
      status: 'resolved',
      user: { name: 'Radha Sharma' },
    });
    const detail = await t.http
      .get(`/v1/admin/sos/${res.body.id as string}`)
      .set(...bearer(admin))
      .expect(200);
    expect(detail.body.emergencyContacts).toHaveLength(2);
    expect(detail.body.dispatchResult).toMatchObject({ contactsNotified: 2, appUsersNotified: 1 });
  });

  it('cancels an accidental SOS before anyone is alerted', async () => {
    await contacts();
    const res = await trigger().expect(202);
    const cancelled = await t.http
      .post(`/v1/safety/sos/${res.body.id as string}/cancel`)
      .set(...bearer(user.token))
      .expect(200);
    expect(cancelled.body).toMatchObject({ status: 'cancelled', cancellableForS: 0 });
    expect(await drainQueue(t, 'sos', SosProcessor)).toEqual(['skipped-cancelled']);
    expect(sms.outbox).toHaveLength(0);

    // After the grace window, cancel is refused (resolve instead).
    const late = await trigger().expect(202);
    await t.prisma.sosEvent.update({
      where: { id: late.body.id as string },
      data: { createdAt: new Date(Date.now() - 3 * 60_000) },
    });
    await t.http
      .post(`/v1/safety/sos/${late.body.id as string}/cancel`)
      .set(...bearer(user.token))
      .expect(409);
  });

  it('rate-limits new SOS events but still records the attempt; guests can raise SOS', async () => {
    for (let i = 0; i < 2; i++) {
      const r = await trigger().expect(202);
      await t.http
        .post(`/v1/safety/sos/${r.body.id as string}/cancel`)
        .set(...bearer(user.token))
        .expect(200);
    }
    const limited = await trigger().expect(429);
    expect(limited.body.error.code).toBe('SOS_RATE_LIMITED');
    expect(await t.prisma.auditLog.count({ where: { action: 'sos.rate_limited' } })).toBe(1);

    const guest = await t.http
      .post('/v1/auth/firebase')
      .send({ idToken: 'mock:guest:guest-sos' })
      .expect(200);
    const g = await trigger(key(), guest.body.accessToken as string).expect(202);
    expect((await drainQueue(t, 'sos', SosProcessor)).sort()).toEqual([
      'dispatched',
      'skipped-cancelled',
      'skipped-cancelled',
    ]);
    expect(g.body.contactsNotified).toBe(0);

    await trigger(key(), user.token, { lat: 95, lng: 77 }).expect(400);
    await t.http
      .post('/v1/safety/sos')
      .set(...bearer(user.token))
      .send(at)
      .expect(400);
  });

  it('lets admins close an SOS as a false alarm and hides other users’ events', async () => {
    const res = await trigger().expect(202);
    const other = await signInMobile(t, 'other', '+919811100099');
    await t.http
      .get(`/v1/safety/sos/${res.body.id as string}`)
      .set(...bearer(other.token))
      .expect(404);
    await t.http
      .get('/v1/admin/sos')
      .set(...bearer(user.token))
      .expect(403);
    const admin = await adminToken(t);
    const closed = await t.http
      .post(`/v1/admin/sos/${res.body.id as string}/resolve`)
      .set(...bearer(admin))
      .send({ falseAlarm: true, note: 'Pocket press' })
      .expect(200);
    expect(closed.body.status).toBe('false_alarm');
    const row = await t.prisma.sosEvent.findUniqueOrThrow({ where: { id: res.body.id as string } });
    expect(row.handledById).not.toBeNull();
  });

  it('retries failed SMS on the notifications queue', async () => {
    await contacts();
    sms.rejectNumbers.add('+919811100002');
    await trigger().expect(202);
    await drainQueue(t, 'sos', SosProcessor);
    const failed = await t.prisma.notification.findFirstOrThrow({
      where: { recipient: '+919811100002', channel: 'sms' },
    });
    expect(failed).toMatchObject({ status: 'failed' });
    expect(failed.error).toContain('rejected');
    expect(await drainQueue(t, 'notifications', NotificationsProcessor)).toEqual([]);
    expect(await collectEvents(await connectSocket(t), 'sos.new', 50)).toEqual([]);
  });
});
