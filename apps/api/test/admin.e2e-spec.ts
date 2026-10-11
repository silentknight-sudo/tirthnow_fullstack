import { MockPushAdapter } from '../src/core/providers';
import { NotificationsProcessor } from '../src/modules/notifications';
import { type CatalogFixture, seedCatalog } from './fixtures';
import {
  adminToken,
  bearer,
  createPortalUser,
  createTestApp,
  drainQueue,
  resetState,
  signInMobile,
  signInPortal,
  type TestApp,
} from './helpers';

let seq = 0;
const key = () => `adm-${Date.now()}-${++seq}`;

describe('admin', () => {
  let t: TestApp;
  let fx: CatalogFixture;
  let admin: string;
  let push: MockPushAdapter;

  beforeAll(async () => {
    t = await createTestApp();
    push = t.app.get(MockPushAdapter);
  });
  beforeEach(async () => {
    await resetState(t);
    fx = await seedCatalog(t.prisma);
    admin = await adminToken(t);
  });
  afterAll(async () => {
    await t.close();
  });

  it('reports KPIs for a date range', async () => {
    await signInMobile(t, 'kpi-user', '+919855500001');
    const res = await t.http
      .get('/v1/admin/kpis')
      .set(...bearer(admin))
      .expect(200);
    expect(res.body).toMatchObject({
      users: { newUsers: 2, activeUsers: 2 },
      orders: { created: 0, paid: 0, gmvPaise: 0 },
      finance: { revenuePaise: 0, gstPaise: 0, refundsPaise: 0 },
      sos: { total: 0 },
      ai: { requests: 0 },
    });
    expect(res.body.range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await t.http
      .get('/v1/admin/kpis?from=2026-10-10&to=2026-10-01')
      .set(...bearer(admin))
      .expect(400);
    await t.http
      .get('/v1/admin/kpis?from=2024-01-01&to=2026-01-01')
      .set(...bearer(admin))
      .expect(400);
    const user = await signInMobile(t, 'nosy', '+919855500002');
    await t.http
      .get('/v1/admin/kpis')
      .set(...bearer(user.token))
      .expect(403);
  });

  it('searches users, suspends and reactivates them, and guards admin accounts', async () => {
    const yatri = await signInMobile(t, 'yatri-adm', '+919855500003');
    await t.http
      .patch('/v1/me/profile')
      .set(...bearer(yatri.token))
      .send({ displayName: 'Meera Bai' })
      .expect(200);
    const found = await t.http
      .get('/v1/admin/users?q=meera')
      .set(...bearer(admin))
      .expect(200);
    expect(found.body.data).toMatchObject([
      { id: yatri.userId, displayName: 'Meera Bai', phoneE164: '+919855500003', roles: ['user'] },
    ]);
    expect(
      (
        await t.http
          .get('/v1/admin/users?q=9855500003')
          .set(...bearer(admin))
          .expect(200)
      ).body.data,
    ).toHaveLength(1);
    expect(
      (
        await t.http
          .get('/v1/admin/users?role=admin')
          .set(...bearer(admin))
          .expect(200)
      ).body.data,
    ).toHaveLength(1);

    await t.http
      .patch(`/v1/admin/users/${yatri.userId}/status`)
      .set(...bearer(admin))
      .send({ status: 'suspended', reason: 'Spam reports' })
      .expect(200);
    await t.http.post('/v1/auth/refresh').send({ refreshToken: yatri.refreshToken }).expect(401);
    expect(
      (
        await t.http
          .get('/v1/admin/users?status=suspended')
          .set(...bearer(admin))
          .expect(200)
      ).body.data[0].id,
    ).toBe(yatri.userId);
    await t.http
      .patch(`/v1/admin/users/${yatri.userId}/status`)
      .set(...bearer(admin))
      .send({ status: 'active', reason: 'Appeal accepted' })
      .expect(200);

    // Ordinary admins cannot touch other admins or grant roles; super admins can.
    await createPortalUser(t, {
      email: 'other@ops.test',
      password: 'Password-123',
      roles: ['user', 'admin'],
    });
    const otherAdmin = (
      await t.prisma.user.findFirstOrThrow({ where: { email: 'other@ops.test' } })
    ).id;
    await t.http
      .patch(`/v1/admin/users/${otherAdmin}/status`)
      .set(...bearer(admin))
      .send({ status: 'suspended', reason: 'nope' })
      .expect(403);
    await t.http
      .post(`/v1/admin/users/${yatri.userId}/roles`)
      .set(...bearer(admin))
      .send({ role: 'admin' })
      .expect(403);

    await createPortalUser(t, {
      email: 'root@ops.test',
      password: 'Password-123',
      roles: ['user', 'super_admin'],
    });
    const root = (await signInPortal(t, 'root@ops.test', 'Password-123')).token;
    await t.http
      .post(`/v1/admin/users/${yatri.userId}/roles`)
      .set(...bearer(root))
      .send({ role: 'admin' })
      .expect(200);
    expect(
      (
        await t.http
          .get('/v1/admin/users?role=admin')
          .set(...bearer(root))
          .expect(200)
      ).body.data,
    ).toHaveLength(3);
    await t.http
      .delete(`/v1/admin/users/${yatri.userId}/roles/admin`)
      .set(...bearer(root))
      .expect(200);
    const rootId = (await t.prisma.user.findFirstOrThrow({ where: { email: 'root@ops.test' } })).id;
    await t.http
      .delete(`/v1/admin/users/${rootId}/roles/super_admin`)
      .set(...bearer(root))
      .expect(400);
    await t.http
      .patch(`/v1/admin/users/${rootId}/status`)
      .set(...bearer(root))
      .send({ status: 'suspended', reason: 'self' })
      .expect(400);

    const trail = await t.http
      .get(`/v1/admin/audit-logs?entityId=${yatri.userId}`)
      .set(...bearer(admin))
      .expect(200);
    expect(trail.body.data.map((a: { action: string }) => a.action)).toEqual([
      'user.role_revoke',
      'user.role_grant',
      'user.reactivate',
      'user.suspend',
    ]);
  });

  it('manages runtime config that the public config endpoint serves', async () => {
    await t.http
      .put('/v1/admin/config')
      .set(...bearer(admin))
      .send({
        key: 'banner.kartik',
        kind: 'banner',
        value: { title: 'Kartik maas', link: '/festivals' },
        targeting: { platforms: ['android'] },
      })
      .expect(200);
    const pub = await t.http.get('/v1/config?platform=android').expect(200);
    expect(JSON.stringify(pub.body)).toContain('Kartik maas');
    expect(
      JSON.stringify((await t.http.get('/v1/config?platform=ios').expect(200)).body),
    ).not.toContain('Kartik maas');
    await t.http
      .put('/v1/admin/config')
      .set(...bearer(admin))
      .send({
        key: 'banner.kartik',
        kind: 'banner',
        value: { title: 'Kartik maas' },
        isActive: false,
      })
      .expect(200);
    expect(
      JSON.stringify((await t.http.get('/v1/config?platform=android').expect(200)).body),
    ).not.toContain('Kartik maas');
    await t.http
      .delete('/v1/admin/config/banner.kartik')
      .set(...bearer(admin))
      .expect(204);
    await t.http
      .put('/v1/admin/config')
      .set(...bearer(admin))
      .send({ key: 'Bad Key', kind: 'banner', value: {} })
      .expect(400);
  });

  it('broadcasts to a city segment, respecting marketing opt-outs except for emergencies', async () => {
    const a = await signInMobile(t, 'b-a', '+919855500010');
    const b = await signInMobile(t, 'b-b', '+919855500011');
    await t.http
      .patch('/v1/me/profile')
      .set(...bearer(a.token))
      .send({ homeCityId: fx.vrindavan })
      .expect(200);
    await t.http
      .patch('/v1/me/profile')
      .set(...bearer(b.token))
      .send({ homeCityId: fx.mathura })
      .expect(200);
    await t.http
      .post('/v1/me/devices')
      .set(...bearer(a.token))
      .send({ platform: 'android', fcmToken: 'fcm-a' })
      .expect(200);
    await t.http
      .post('/v1/me/devices')
      .set(...bearer(b.token))
      .send({ platform: 'android', fcmToken: 'fcm-b' })
      .expect(200);
    await t.http
      .put('/v1/notifications/preferences')
      .set(...bearer(a.token))
      .send({ marketing: true })
      .expect(200);

    await t.http
      .post('/v1/admin/broadcasts')
      .set(...bearer(admin))
      .set('Idempotency-Key', key())
      .send({ title: 'Phoolon wali Holi', body: 'Banke Bihari, 4 pm today', city: 'vrindavan' })
      .expect(202);
    await drainQueue(t, 'notifications', NotificationsProcessor);
    expect(push.to('fcm-a').map((m) => m.title)).toEqual(['Phoolon wali Holi']);
    expect(push.to('fcm-b')).toHaveLength(0);

    await t.http
      .post('/v1/admin/broadcasts')
      .set(...bearer(admin))
      .set('Idempotency-Key', key())
      .send({ title: 'Heavy rain alert', body: 'Avoid the Yamuna ghats tonight', emergency: true })
      .expect(202);
    await drainQueue(t, 'notifications', NotificationsProcessor);
    expect(push.to('fcm-b').map((m) => [m.title, m.priority, m.channel])).toEqual([
      ['Heavy rain alert', 'high', 'sos'],
    ]);
    await t.http
      .post('/v1/admin/broadcasts')
      .set(...bearer(admin))
      .send({ title: 'No key', body: 'x x x' })
      .expect(400);
  });

  it('overrides notification templates', async () => {
    const list = await t.http
      .get('/v1/admin/notification-templates')
      .set(...bearer(admin))
      .expect(200);
    expect(list.body.find((x: { key: string }) => x.key === 'sos_alert')).toMatchObject({
      channels: ['sms', 'whatsapp', 'push'],
      variables: ['name', 'link', 'police'],
    });
    await t.http
      .put('/v1/admin/notification-templates')
      .set(...bearer(admin))
      .send({
        key: 'sos_alert',
        channel: 'sms',
        body: { en: 'SOS from {{name}}: {{link}}' },
        dltTemplateId: '1107161234567890',
      })
      .expect(200);
    await t.http
      .put('/v1/admin/notification-templates')
      .set(...bearer(admin))
      .send({ key: 'payout_paid', channel: 'sms', body: { en: 'x' } })
      .expect(400);
    const row = await t.prisma.notificationTemplate.findFirstOrThrow({
      where: { key: 'sos_alert', channel: 'sms' },
    });
    expect(row).toMatchObject({ dltTemplateId: '1107161234567890', isActive: true });
    await t.http
      .delete(`/v1/admin/notification-templates/${row.id}`)
      .set(...bearer(admin))
      .expect(204);
    expect(
      (await t.prisma.notificationTemplate.findUniqueOrThrow({ where: { id: row.id } })).isActive,
    ).toBe(false);
  });
});
