import { type Socket } from 'socket.io-client';
import { MockPushAdapter } from '../src/core/providers';
import { istToUtc, addDays, istDate } from '../src/core/time';
import { AartiRemindersService, NotificationsProcessor } from '../src/modules/notifications';
import { type CatalogFixture, seedCatalog } from './fixtures';
import {
  adminToken,
  bearer,
  collectEvents,
  connectSocket,
  createActiveVendor,
  createTestApp,
  drainQueue,
  nextEvent,
  resetState,
  signInMobile,
  subscribeRoom,
  type TestApp,
} from './helpers';

const d = (n: number) => addDays(istDate(new Date()), n);
let seq = 0;
const key = () => `n-key-${Date.now()}-${++seq}`;

describe('notifications, realtime, weather and transit', () => {
  let t: TestApp;
  let fx: CatalogFixture;
  let admin: string;
  let user: { token: string; userId: string };
  let push: MockPushAdapter;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    push = t.app.get(MockPushAdapter);
  });
  beforeEach(async () => {
    await resetState(t);
    fx = await seedCatalog(t.prisma);
    admin = await adminToken(t);
    user = await signInMobile(t, 'yatri-n', '+919822200001');
    await t.http
      .post('/v1/me/devices')
      .set(...bearer(user.token))
      .send({ platform: 'android', fcmToken: 'fcm-yatri' })
      .expect(200);
    await t.http
      .post('/v1/admin/commission-rules')
      .set(...bearer(admin))
      .send({ name: 'Default', percentBps: 1000 })
      .expect(201);
  });
  afterEach(() => {
    for (const s of sockets.splice(0)) s.disconnect();
  });
  afterAll(async () => {
    await t.close();
  });

  const socket = async (token?: string) => {
    const s = await connectSocket(t, token);
    sockets.push(s);
    return s;
  };

  async function cabBooking() {
    const cab = await createActiveVendor(t, {
      email: `cab${seq++}@n.test`,
      type: 'cab',
      cityId: fx.mathura,
      adminToken: admin,
    });
    await t.http
      .post(`/v1/me/devices`)
      .set(...bearer(cab.token))
      .send({ platform: 'android', fcmToken: 'fcm-vendor' })
      .expect(200);
    await t.http
      .post(`/v1/vendors/${cab.vendorId}/vehicles`)
      .set(...bearer(cab.token))
      .send({
        class: 'sedan',
        registrationNo: `UP85AT${String(2000 + seq)}`,
        seats: 4,
        driverName: 'Mohan',
      })
      .expect(201);
    await t.http
      .put(`/v1/vendors/${cab.vendorId}/cab-fares/sedan`)
      .set(...bearer(cab.token))
      .send({ baseFarePaise: 10_000, perKmPaise: 1_400, perMinPaise: 100, minFarePaise: 25_000 })
      .expect(200);
    const res = await t.http
      .post('/v1/orders')
      .set(...bearer(user.token))
      .set('Idempotency-Key', key())
      .send({
        type: 'cab',
        cab: {
          vendorId: cab.vendorId,
          vehicleClass: 'sedan',
          pickup: { lat: 27.5806, lng: 77.6996 },
          drop: { lat: 27.5717, lng: 77.6799 },
          pickupAt: istToUtc(d(1), 12, 0).toISOString(),
        },
      })
      .expect(201);
    return {
      cab,
      orderId: res.body.order.id as string,
      providerOrderId: res.body.payment.providerOrderId as string,
    };
  }

  it('notifies traveller and vendor about bookings, in-app and by push, and streams order status', async () => {
    const { cab, orderId, providerOrderId } = await cabBooking();
    const traveller = await socket(user.token);
    const vendorSocket = await socket(cab.token);
    expect(await subscribeRoom(traveller, `order:${orderId}`)).toEqual({
      ok: true,
      room: `order:${orderId}`,
    });
    expect(await subscribeRoom(vendorSocket, `vendor:${cab.vendorId}`)).toMatchObject({ ok: true });

    // Strangers and anonymous clients cannot follow someone else's order.
    const stranger = await signInMobile(t, 'stranger', '+919822200009');
    expect(await subscribeRoom(await socket(stranger.token), `order:${orderId}`)).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect(await subscribeRoom(await socket(), `order:${orderId}`)).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect(await subscribeRoom(await socket(stranger.token), `vendor:${cab.vendorId}`)).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect(await subscribeRoom(await socket(stranger.token), 'admin')).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect(await subscribeRoom(traveller, 'orders:everything')).toEqual({
      ok: false,
      error: 'INVALID_ROOM',
    });

    const status = nextEvent<{ status: string; code: string }>(traveller, 'order.status');
    const newOrder = nextEvent<{ orderId: string }>(vendorSocket, 'order.new');
    await t.http.post('/v1/dev/payments/checkout').send({ providerOrderId }).expect(200);
    expect((await status).status).toBe('confirmed');
    expect((await newOrder).orderId).toBe(orderId);

    await drainQueue(t, 'notifications', NotificationsProcessor);
    expect(push.to('fcm-yatri').map((m) => m.title)).toEqual(['Booking confirmed']);
    expect(push.to('fcm-yatri')[0]?.data).toMatchObject({ type: 'order', orderId });
    // (The vendor also got the account-approved notice during onboarding.)
    expect(push.to('fcm-vendor').map((m) => m.title)).toContain('New booking');

    const inbox = await t.http
      .get('/v1/notifications')
      .set(...bearer(user.token))
      .expect(200);
    expect(inbox.body).toMatchObject({ unreadCount: 1, nextCursor: null });
    expect(inbox.body.data[0]).toMatchObject({
      title: 'Booking confirmed',
      readAt: null,
      data: { orderId },
    });
    expect(inbox.body.data[0].body).toMatch(/is confirmed\. Booking ID TN-/);

    // The driver shares location; the traveller sees it live and on the tracking endpoint.
    const assigned = nextEvent<{ status: string }>(traveller, 'order.status');
    await t.http
      .post(`/v1/vendors/${cab.vendorId}/orders/${orderId}/accept`)
      .set(...bearer(cab.token))
      .expect(200);
    expect((await assigned).status).toBe('confirmed');
    const live = nextEvent<{ lat: number }>(traveller, 'cab.location');
    await t.http
      .post(`/v1/vendors/${cab.vendorId}/orders/${orderId}/location`)
      .set(...bearer(cab.token))
      .send({ lat: 27.579, lng: 77.69, headingDeg: 90, speedKph: 22 })
      .expect(200);
    expect((await live).lat).toBe(27.579);
    const tracking = await t.http
      .get(`/v1/orders/${orderId}/tracking`)
      .set(...bearer(user.token))
      .expect(200);
    expect(tracking.body).toMatchObject({
      lat: 27.579,
      lng: 77.69,
      headingDeg: 90,
      room: `order:${orderId}`,
    });
    await t.http
      .get(`/v1/orders/${orderId}/tracking`)
      .set(...bearer(stranger.token))
      .expect(404);

    await drainQueue(t, 'notifications', NotificationsProcessor);
    expect(push.to('fcm-yatri').map((m) => m.title)).toEqual([
      'Booking confirmed',
      'Your booking is accepted',
    ]);
    expect(push.to('fcm-yatri')[1]?.body).toMatch(/Mohan · UP85AT\d{4}/);

    const read = await t.http
      .post(`/v1/notifications/${inbox.body.data[0].id as string}/read`)
      .set(...bearer(user.token))
      .expect(200);
    expect(read.body.readAt).not.toBeNull();
    expect(
      (
        await t.http
          .post('/v1/notifications/read-all')
          .set(...bearer(user.token))
          .expect(200)
      ).body,
    ).toEqual({ updated: 1 });
    expect(
      (
        await t.http
          .get('/v1/notifications?unreadOnly=true')
          .set(...bearer(user.token))
          .expect(200)
      ).body,
    ).toMatchObject({ data: [], unreadCount: 0 });
    await t.http
      .post(`/v1/notifications/${inbox.body.data[0].id as string}/read`)
      .set(...bearer(stranger.token))
      .expect(404);
  });

  it('respects preferences and forgets dead push tokens', async () => {
    const prefs = await t.http
      .put('/v1/notifications/preferences')
      .set(...bearer(user.token))
      .send({ bookingUpdates: false })
      .expect(200);
    expect(prefs.body).toMatchObject({ bookingUpdates: false });
    expect(
      (
        await t.http
          .get('/v1/notifications/preferences')
          .set(...bearer(user.token))
          .expect(200)
      ).body,
    ).toMatchObject({ bookingUpdates: false });
    await t.http
      .put('/v1/notifications/preferences')
      .set(...bearer(user.token))
      .send({ bookingUpdates: 'no' })
      .expect(400);

    const { providerOrderId } = await cabBooking();
    await t.http.post('/v1/dev/payments/checkout').send({ providerOrderId }).expect(200);
    await drainQueue(t, 'notifications', NotificationsProcessor);
    expect(push.to('fcm-yatri')).toHaveLength(0);
    expect(
      (
        await t.http
          .get('/v1/notifications')
          .set(...bearer(user.token))
          .expect(200)
      ).body.data,
    ).toHaveLength(0);

    // A dead token is removed when FCM rejects it.
    await t.http
      .put('/v1/notifications/preferences')
      .set(...bearer(user.token))
      .send({ bookingUpdates: true })
      .expect(200);
    await t.http
      .post('/v1/me/devices')
      .set(...bearer(user.token))
      .send({ platform: 'ios', fcmToken: 'invalid-old-phone' })
      .expect(200);
    const second = await cabBooking();
    await t.http
      .post('/v1/dev/payments/checkout')
      .send({ providerOrderId: second.providerOrderId })
      .expect(200);
    await drainQueue(t, 'notifications', NotificationsProcessor);
    expect(push.to('fcm-yatri')).toHaveLength(1);
    expect(await t.prisma.device.count({ where: { fcmToken: 'invalid-old-phone' } })).toBe(0);
  });

  it('manages aarti reminders and sends one push per occurrence', async () => {
    const schedule = await t.prisma.aartiSchedule.findFirstOrThrow({
      where: { templeId: fx.iskcon, kind: 'sandhya' },
    });
    await t.http
      .put('/v1/notifications/preferences')
      .set(...bearer(user.token))
      .send({ defaultReminderMinutes: 20 })
      .expect(200);
    const created = await t.http
      .post('/v1/aarti-reminders')
      .set(...bearer(user.token))
      .send({ aartiScheduleId: schedule.id })
      .expect(201);
    expect(created.body).toMatchObject({
      templeName: 'ISKCON Krishna Balaram Mandir',
      aartiName: 'Sandhya Arati',
      minutesBefore: 20,
    });
    expect(created.body.nextAartiAt).toMatch(/T13:00:00.000Z$/);
    const updated = await t.http
      .post('/v1/aarti-reminders')
      .set(...bearer(user.token))
      .send({ aartiScheduleId: schedule.id, minutesBefore: 30 })
      .expect(201);
    expect(updated.body.id).toBe(created.body.id);
    expect(
      (
        await t.http
          .get('/v1/aarti-reminders')
          .set(...bearer(user.token))
          .expect(200)
      ).body,
    ).toHaveLength(1);
    await t.http
      .post('/v1/aarti-reminders')
      .set(...bearer(user.token))
      .send({ aartiScheduleId: schedule.id, minutesBefore: 1 })
      .expect(400);
    await t.http
      .post('/v1/aarti-reminders')
      .set(...bearer(user.token))
      .send({ aartiScheduleId: '00000000-0000-4000-8000-000000000000' })
      .expect(404);

    const reminders = t.app.get(AartiRemindersService);
    const start = istToUtc(d(1), 18, 30);
    expect(await reminders.sendDue(new Date(start.getTime() - 40 * 60_000))).toBe(0);
    expect(await reminders.sendDue(new Date(start.getTime() - 29 * 60_000))).toBe(1);
    expect(await reminders.sendDue(new Date(start.getTime() - 28 * 60_000))).toBe(0);
    await drainQueue(t, 'notifications', NotificationsProcessor);
    expect(push.to('fcm-yatri').map((m) => [m.title, m.body, m.channel])).toEqual([
      [
        'Sandhya Arati in 29 min',
        'Sandhya Arati at ISKCON Krishna Balaram Mandir starts at 18:30.',
        'aarti',
      ],
    ]);

    // Hindi users get Hindi text.
    await t.http
      .patch('/v1/me/profile')
      .set(...bearer(user.token))
      .send({ preferredLang: 'hi' })
      .expect(200);
    expect(await reminders.sendDue(new Date(istToUtc(d(2), 18, 30).getTime() - 30 * 60_000))).toBe(
      1,
    );
    await drainQueue(t, 'notifications', NotificationsProcessor);
    expect(push.to('fcm-yatri')[1]?.body).toBe(
      'इस्कॉन कृष्ण बलराम मंदिर में Sandhya Arati (hi) 18:30 बजे शुरू होगी।',
    );

    await t.http
      .delete(`/v1/aarti-reminders/${created.body.id as string}`)
      .set(...bearer(user.token))
      .expect(204);
    await t.http
      .delete(`/v1/aarti-reminders/${created.body.id as string}`)
      .set(...bearer(user.token))
      .expect(404);
  });

  it('lets anyone follow aarti countdowns', async () => {
    const anon = await socket();
    const countdown = nextEvent<{
      templeId: string;
      next: { name: string; startsAt: string } | null;
    }>(anon, 'aarti.countdown');
    expect(await subscribeRoom(anon, `aarti:${fx.iskcon}`)).toMatchObject({ ok: true });
    const first = await countdown;
    expect(first.templeId).toBe(fx.iskcon);
    expect(first.next?.name).toMatch(/Arati/);
    expect(await subscribeRoom(anon, 'aarti:00000000-0000-4000-8000-000000000000')).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });

    const pushed = nextEvent<{ next: unknown }>(anon, 'aarti.countdown');
    await t.http
      .post(`/v1/admin/temples/${fx.iskcon}/aarti`)
      .set(...bearer(admin))
      .send({ kind: 'rajbhog', name: { en: 'Raj Bhog Arati' }, localTime: '12:30' })
      .expect(201);
    expect((await pushed).next).toBeTruthy();
    expect(await collectEvents(anon, 'order.status', 100)).toEqual([]);

    const bad = connectSocket(t, 'not-a-jwt');
    await expect(bad).rejects.toThrow('AUTH_UNAUTHENTICATED');
  });

  it('serves weather with advisories and train search', async () => {
    const w = await t.http.get('/v1/weather?city=vrindavan').expect(200);
    expect(w.body).toMatchObject({ cityId: fx.vrindavan, source: 'mock', lat: 27.57, lng: 77.66 });
    expect(w.body.daily).toHaveLength(5);
    expect(w.body.daily[0].date).toBe(d(0));
    expect(typeof w.body.now.tempC).toBe('number');
    const again = await t.http.get('/v1/weather?lat=27.5712&lng=77.6601').expect(200);
    expect(again.body.fetchedAt).toBe(w.body.fetchedAt);
    expect(
      (await t.http.get('/v1/weather?city=vrindavan&lang=hi').expect(200)).body.advisories.every(
        (a: { message: string }) => /[ऀ-ॿ]/.test(a.message),
      ),
    ).toBe(true);
    await t.http.get('/v1/weather').expect(400);
    await t.http.get('/v1/weather?city=atlantis').expect(404);
    await t.http.get('/v1/weather?lat=91&lng=10').expect(400);

    const stations = await t.http.get('/v1/transit/stations?q=mathura').expect(200);
    expect(stations.body.map((s: { code: string }) => s.code)).toEqual(['MTJ']);
    const trains = await t.http.get(`/v1/transit/search?from=NDLS&to=MTJ&date=${d(3)}`).expect(200);
    expect(trains.body.trains[0]).toMatchObject({
      number: '12002',
      departs: '06:00',
      durationMin: 79,
      arrivalDayOffset: 0,
    });
    expect(trains.body.trains[0].bookingUrl).toMatch(/^https:\/\/www\.irctc\.co\.in\//);
    await t.http.get(`/v1/transit/search?from=NDLS&to=XXX&date=${d(3)}`).expect(404);
    await t.http.get(`/v1/transit/search?from=NDLS&to=NDLS&date=${d(3)}`).expect(400);
    await t.http.get('/v1/transit/search?from=ndls&to=MTJ&date=2026-02-30').expect(400);
  });
});
