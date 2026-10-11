import { PaymentsProcessor } from '../src/modules/payments';
import { MockPaymentAdapter } from '../src/core/providers';
import { addDays, istDate } from '../src/core/time';
import { type CatalogFixture, seedCatalog } from './fixtures';
import {
  adminToken,
  bearer,
  createActiveVendor,
  createTestApp,
  drainQueue,
  resetState,
  signInMobile,
  type TestApp,
} from './helpers';

const d = (n: number) => addDays(istDate(new Date()), n);
let seq = 0;
const key = () => `pay-key-${Date.now()}-${++seq}`;

describe('payments', () => {
  let t: TestApp;
  let fx: CatalogFixture;
  let admin: string;
  let user: string;
  let mock: MockPaymentAdapter;

  beforeAll(async () => {
    t = await createTestApp();
    mock = t.app.get(MockPaymentAdapter);
  });
  beforeEach(async () => {
    await resetState(t);
    fx = await seedCatalog(t.prisma);
    admin = await adminToken(t);
    user = (await signInMobile(t, 'yatri-p', '+919811100011')).token;
    mock.holdRefunds = false;
  });
  afterAll(async () => {
    await t.close();
  });

  async function hotelVendor() {
    const v = await createActiveVendor(t, {
      email: `h${seq++}@pay.test`,
      type: 'hotel',
      cityId: fx.vrindavan,
      adminToken: admin,
    });
    const h = await t.http
      .post(`/v1/vendors/${v.vendorId}/hotels`)
      .set(...bearer(v.token))
      .send({
        cityId: fx.vrindavan,
        name: { en: 'Kunj' },
        lat: 27.57,
        lng: 77.68,
        address: 'Parikrama Marg',
        checkinTime: '12:00',
        checkoutTime: '11:00',
        isPublished: true,
      })
      .expect(201);
    const rt = await t.http
      .post(`/v1/vendors/${v.vendorId}/hotels/${h.body.id as string}/room-types`)
      .set(...bearer(v.token))
      .send({ name: { en: 'Std' }, maxGuests: 2, basePricePaise: 100_000, totalRooms: 5 })
      .expect(201);
    return { ...v, roomTypeId: rt.body.id as string };
  }

  async function paidBooking(roomTypeId: string) {
    const res = await t.http
      .post('/v1/orders')
      .set(...bearer(user))
      .set('Idempotency-Key', key())
      .send({
        type: 'hotel',
        hotel: { roomTypeId, checkIn: d(10), checkOut: d(11), rooms: 1, guests: 1 },
      })
      .expect(201);
    await t.http
      .post('/v1/dev/payments/checkout')
      .send({ providerOrderId: res.body.payment.providerOrderId })
      .expect(200);
    return res.body.order as { id: string };
  }

  it('applies the most specific commission rule (vendor > city > type > global)', async () => {
    const v = await hotelVendor();
    const rule = (body: object) =>
      t.http
        .post('/v1/admin/commission-rules')
        .set(...bearer(admin))
        .send(body)
        .expect(201);
    await rule({ name: 'Global', percentBps: 1000 });
    await rule({ name: 'Hotels', orderType: 'hotel', percentBps: 800 });
    await rule({
      name: 'Vrindavan hotels',
      orderType: 'hotel',
      cityId: fx.vrindavan,
      percentBps: 600,
    });
    const a = await paidBooking(v.roomTypeId);
    expect((await t.prisma.order.findUniqueOrThrow({ where: { id: a.id } })).commissionPaise).toBe(
      6_000,
    );

    const vendorRule = await rule({
      name: 'Launch partner',
      vendorId: v.vendorId,
      percentBps: 200,
      flatPaise: 500,
    });
    const b = await paidBooking(v.roomTypeId);
    expect((await t.prisma.order.findUniqueOrThrow({ where: { id: b.id } })).commissionPaise).toBe(
      2_500,
    );

    await t.http
      .patch(`/v1/admin/commission-rules/${vendorRule.body.id as string}`)
      .set(...bearer(admin))
      .send({ isActive: false })
      .expect(200);
    const c = await paidBooking(v.roomTypeId);
    expect((await t.prisma.order.findUniqueOrThrow({ where: { id: c.id } })).commissionPaise).toBe(
      6_000,
    );

    const list = await t.http
      .get('/v1/admin/commission-rules')
      .set(...bearer(admin))
      .expect(200);
    expect(list.body).toHaveLength(4);
    await t.http
      .post('/v1/admin/commission-rules')
      .set(...bearer(user))
      .send({ name: 'x', percentBps: 1 })
      .expect(403);
  });

  it('settles slow refunds from the refund webhook, once', async () => {
    const v = await hotelVendor();
    const o = await paidBooking(v.roomTypeId);
    mock.holdRefunds = true;
    await t.http
      .post(`/v1/orders/${o.id}/cancel`)
      .set(...bearer(user))
      .set('Idempotency-Key', key())
      .send({ reasonCode: 'change_of_plans' })
      .expect(200);
    await drainQueue(t, 'payments', PaymentsProcessor);

    const refund = await t.prisma.refund.findFirstOrThrow({
      where: { payment: { orderId: o.id } },
    });
    expect(refund).toMatchObject({ status: 'pending', amountPaise: 100_000 });
    expect(refund.providerRefundId).toMatch(/^rfnd_mock_/);
    expect(
      (
        await t.http
          .get(`/v1/orders/${o.id}`)
          .set(...bearer(user))
          .expect(200)
      ).body.status,
    ).toBe('cancelled');

    const hook = mock.webhook(mock.refundEvent(refund.providerRefundId ?? ''));
    const send = () =>
      t.http
        .post('/v1/payments/webhooks/mock')
        .set('content-type', 'application/json')
        .set('x-mock-signature', hook.signature)
        .send(hook.body.toString())
        .expect(200);
    await send();
    await send();

    const order = await t.http
      .get(`/v1/orders/${o.id}`)
      .set(...bearer(user))
      .expect(200);
    expect(order.body).toMatchObject({ status: 'refunded', refundedPaise: 100_000 });
    const sums = await t.prisma.ledgerEntry.aggregate({
      where: { orderId: o.id, account: 'refunds_payable' },
      _sum: { debitPaise: true, creditPaise: true },
    });
    expect(sums._sum).toEqual({ debitPaise: 100_000n, creditPaise: 100_000n });

    const payments = await t.http
      .get(`/v1/admin/payments?orderId=${o.id}`)
      .set(...bearer(admin))
      .expect(200);
    expect(payments.body[0]).toMatchObject({ status: 'refunded' });
    expect(payments.body[0].events.map((e: { eventType: string }) => e.eventType)).toEqual([
      'payment.captured',
      'refund.processed',
    ]);
  });

  it('marks a failed refund and lets an admin retry it', async () => {
    const v = await hotelVendor();
    const o = await paidBooking(v.roomTypeId);
    mock.holdRefunds = true;
    await t.http
      .post(`/v1/orders/${o.id}/cancel`)
      .set(...bearer(user))
      .set('Idempotency-Key', key())
      .send({ reasonCode: 'change_of_plans' })
      .expect(200);
    await drainQueue(t, 'payments', PaymentsProcessor);
    const refund = await t.prisma.refund.findFirstOrThrow({
      where: { payment: { orderId: o.id } },
    });
    const hook = mock.webhook(mock.refundEvent(refund.providerRefundId ?? '', 'failed'));
    await t.http
      .post('/v1/payments/webhooks/mock')
      .set('content-type', 'application/json')
      .set('x-mock-signature', hook.signature)
      .send(hook.body.toString())
      .expect(200);
    expect((await t.prisma.refund.findUniqueOrThrow({ where: { id: refund.id } })).status).toBe(
      'failed',
    );
    expect(
      (
        await t.http
          .get(`/v1/orders/${o.id}`)
          .set(...bearer(user))
          .expect(200)
      ).body.status,
    ).toBe('cancelled');

    mock.holdRefunds = false;
    const retry = () =>
      t.http
        .post(`/v1/admin/refunds/${refund.id}/retry`)
        .set(...bearer(admin))
        .set('Idempotency-Key', key());
    await retry().expect(200);
    await drainQueue(t, 'payments', PaymentsProcessor);
    expect(
      (
        await t.http
          .get(`/v1/orders/${o.id}`)
          .set(...bearer(user))
          .expect(200)
      ).body,
    ).toMatchObject({ status: 'refunded', refundedPaise: 100_000 });
    expect((await retry().expect(409)).body.error.code).toBe('REFUND_INVALID');
  });
});
