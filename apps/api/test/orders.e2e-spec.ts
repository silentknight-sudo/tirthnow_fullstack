import { InventoryFacade } from '../src/modules/inventory';
import { OrdersProcessor } from '../src/modules/orders';
import { PaymentsProcessor, PayoutsProcessor } from '../src/modules/payments';
import { MockPaymentAdapter } from '../src/core/providers';
import { addDays, istDate, istToUtc } from '../src/core/time';
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

const today = istDate(new Date());
const d = (n: number) => addDays(today, n);
let keySeq = 0;
const key = () => `test-key-${Date.now()}-${++keySeq}`;

describe('orders and payments', () => {
  let t: TestApp;
  let fx: CatalogFixture;
  let admin: string;
  let user: { token: string; userId: string };

  beforeAll(async () => {
    t = await createTestApp({ env: { PAYOUT_SETTLEMENT_HOLD_DAYS: '0', PAYOUT_MIN_PAISE: '100' } });
  });
  beforeEach(async () => {
    await resetState(t);
    fx = await seedCatalog(t.prisma);
    admin = await adminToken(t);
    user = await signInMobile(t, 'yatri-1', '+919811122233');
    await t.http
      .post('/v1/admin/commission-rules')
      .set(...bearer(admin))
      .send({ name: 'Default', percentBps: 1000 })
      .expect(201);
  });
  afterAll(async () => {
    await t.close();
  });

  // ───────────── helpers ─────────────

  async function hotel(policy = { freeUntilHoursBefore: 48, penaltyPctAfter: 50, noShowPct: 100 }) {
    const v = await createActiveVendor(t, {
      email: `hotel-${keySeq++}@ord.test`,
      type: 'hotel',
      cityId: fx.vrindavan,
      adminToken: admin,
    });
    const h = await t.http
      .post(`/v1/vendors/${v.vendorId}/hotels`)
      .set(...bearer(v.token))
      .send({
        cityId: fx.vrindavan,
        name: { en: 'Radha Residency' },
        lat: 27.57,
        lng: 77.68,
        address: 'Raman Reti',
        checkinTime: '12:00',
        checkoutTime: '11:00',
        cancellationPolicy: policy,
        isPublished: true,
      })
      .expect(201);
    const rt = await t.http
      .post(`/v1/vendors/${v.vendorId}/hotels/${h.body.id as string}/room-types`)
      .set(...bearer(v.token))
      .send({ name: { en: 'Deluxe' }, maxGuests: 2, basePricePaise: 200_000, totalRooms: 2 })
      .expect(201);
    await t.http
      .post(`/v1/vendors/${v.vendorId}/bank-accounts`)
      .set(...bearer(v.token))
      .send({
        accountHolder: 'Radha Hospitality',
        accountNumber: '123456789012',
        ifsc: 'HDFC0001234',
      })
      .expect(201);
    return { ...v, roomTypeId: rt.body.id as string };
  }

  const book = (body: object, k = key()) =>
    t.http
      .post('/v1/orders')
      .set(...bearer(user.token))
      .set('Idempotency-Key', k)
      .send(body);
  const bookHotel = (roomTypeId: string, checkIn: string, checkOut: string, k?: string) =>
    book({ type: 'hotel', hotel: { roomTypeId, checkIn, checkOut, rooms: 1, guests: 2 } }, k);

  const pay = async (
    providerOrderId: string,
    outcome: 'success' | 'failure' = 'success',
    deliverWebhook = true,
  ) =>
    (
      await t.http
        .post('/v1/dev/payments/checkout')
        .send({ providerOrderId, outcome, deliverWebhook })
        .expect(200)
    ).body as { providerPaymentId: string; signature: string };

  const order = async (id: string) =>
    (
      await t.http
        .get(`/v1/orders/${id}`)
        .set(...bearer(user.token))
        .expect(200)
    ).body;
  const available = async (roomTypeId: string, date: string) =>
    (
      await t.prisma.roomInventory.findFirstOrThrow({
        where: { roomTypeId, stayDate: new Date(`${date}T00:00:00Z`) },
      })
    ).available;

  async function ledgerFor(orderId: string) {
    const rows = await t.prisma.ledgerEntry.groupBy({
      by: ['account'],
      where: { orderId },
      _sum: { debitPaise: true, creditPaise: true },
    });
    return Object.fromEntries(
      rows.map((r) => [r.account, Number((r._sum.creditPaise ?? 0n) - (r._sum.debitPaise ?? 0n))]),
    );
  }

  async function expectLedgerBalanced() {
    const all = await t.prisma.ledgerEntry.aggregate({
      _sum: { debitPaise: true, creditPaise: true },
    });
    expect(all._sum.debitPaise).toEqual(all._sum.creditPaise);
  }

  const drainPayments = () => drainQueue(t, 'payments', PaymentsProcessor);

  // ───────────── tests ─────────────

  it('books a hotel: hold → pay → webhook confirms → ledger splits the sale', async () => {
    const v = await hotel();
    const k = key();
    const res = await bookHotel(v.roomTypeId, d(10), d(12), k).expect(201);
    const { order: o, payment } = res.body;
    expect(o).toMatchObject({
      type: 'hotel',
      status: 'pending',
      subtotalPaise: 400_000,
      totalPaise: 400_000,
    });
    expect(o.code).toMatch(/^TN-\d{4}-[A-Z0-9]{5}$/);
    expect(payment).toMatchObject({
      provider: 'mock',
      amountPaise: 400_000,
      currency: 'INR',
      keyId: 'rzp_test_mock',
    });
    expect(await available(v.roomTypeId, d(10))).toBe(1);

    // Replaying the request returns the same booking and holds nothing more.
    const replay = await bookHotel(v.roomTypeId, d(10), d(12), k).expect(201);
    expect(replay.body.order.id).toBe(o.id);
    expect(await available(v.roomTypeId, d(10))).toBe(1);

    const checkout = await pay(payment.providerOrderId as string);
    const confirmed = await order(o.id as string);
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.holdExpiresAt).toBeNull();
    expect(confirmed.history.map((h: { to: string }) => h.to)).toEqual(['pending', 'confirmed']);

    // The app's verify call after checkout is harmless once the webhook has confirmed.
    await t.http
      .post(`/v1/orders/${o.id as string}/payments/verify`)
      .set(...bearer(user.token))
      .set('Idempotency-Key', key())
      .send({
        providerOrderId: payment.providerOrderId,
        providerPaymentId: checkout.providerPaymentId,
        signature: checkout.signature,
      })
      .expect(200);

    expect(await ledgerFor(o.id as string)).toEqual({
      platform_clearing: -400_000,
      vendor_pending: 352_800,
      platform_revenue: 40_000,
      gst_payable: 7_200,
    });
    const row = await t.prisma.order.findUniqueOrThrow({ where: { id: o.id as string } });
    expect(row.commissionPaise).toBe(40_000);
    await expectLedgerBalanced();
  });

  it('rejects forged checkout signatures and webhooks, and processes each webhook once', async () => {
    const v = await hotel();
    const { body } = await bookHotel(v.roomTypeId, d(10), d(11)).expect(201);
    const providerOrderId = body.payment.providerOrderId as string;
    const checkout = await pay(providerOrderId, 'success', false);

    const forged = await t.http
      .post(`/v1/orders/${body.order.id as string}/payments/verify`)
      .set(...bearer(user.token))
      .set('Idempotency-Key', key())
      .send({
        providerOrderId,
        providerPaymentId: checkout.providerPaymentId,
        signature: 'f'.repeat(64),
      })
      .expect(400);
    expect(forged.body.error.code).toBe('PAYMENT_SIGNATURE_INVALID');

    const mock = t.app.get(MockPaymentAdapter);
    const hook = mock.webhook(mock.paymentEvent(checkout.providerPaymentId), 'evt_once');
    const bad = await t.http
      .post('/v1/payments/webhooks/mock')
      .set('content-type', 'application/json')
      .set('x-mock-signature', 'bad')
      .send(hook.body.toString())
      .expect(401);
    expect(bad.body.error.code).toBe('WEBHOOK_SIGNATURE_INVALID');
    expect(await t.prisma.paymentEvent.count()).toBe(0);

    const first = await t.http
      .post('/v1/payments/webhooks/mock')
      .set('content-type', 'application/json')
      .set('x-mock-signature', hook.signature)
      .send(hook.body.toString())
      .expect(200);
    const second = await t.http
      .post('/v1/payments/webhooks/mock')
      .set('content-type', 'application/json')
      .set('x-mock-signature', hook.signature)
      .send(hook.body.toString())
      .expect(200);
    expect([first.body.status, second.body.status]).toEqual(['processed', 'duplicate']);
    expect((await order(body.order.id as string)).status).toBe('confirmed');
    expect(
      await t.prisma.ledgerEntry.count({
        where: { orderId: body.order.id as string, memo: { startsWith: 'sale' } },
      }),
    ).toBe(4);
  });

  it('keeps an order pending after a failed payment and lets the user retry', async () => {
    const v = await hotel();
    const { body } = await bookHotel(v.roomTypeId, d(10), d(11)).expect(201);
    await pay(body.payment.providerOrderId as string, 'failure');
    expect((await order(body.order.id as string)).status).toBe('pending');
    const again = await t.http
      .post(`/v1/orders/${body.order.id as string}/pay`)
      .set(...bearer(user.token))
      .expect(200);
    expect(again.body.providerOrderId).toBe(body.payment.providerOrderId);
    await pay(body.payment.providerOrderId as string);
    expect((await order(body.order.id as string)).status).toBe('confirmed');
  });

  it('expires unpaid holds and refunds a payment that arrives too late', async () => {
    const v = await hotel();
    const { body } = await bookHotel(v.roomTypeId, d(10), d(11)).expect(201);
    await t.prisma.order.update({
      where: { id: body.order.id as string },
      data: { holdExpiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await t.app
      .get(OrdersProcessor)
      .process({ name: 'expire-holds', data: {} } as never);
    expect(expired).toEqual({ confirmed: 0, cancelled: 1 });
    expect((await order(body.order.id as string)).status).toBe('cancelled');
    expect(await available(v.roomTypeId, d(10))).toBe(2);

    await pay(body.payment.providerOrderId as string);
    await drainPayments();
    const after = await order(body.order.id as string);
    expect(after).toMatchObject({ status: 'refunded', refundedPaise: 200_000 });
    expect(await ledgerFor(body.order.id as string)).toEqual({
      platform_clearing: 0,
      refunds_payable: 0,
    });
    await expectLedgerBalanced();
  });

  it('cancels inside the free window with a full refund', async () => {
    const v = await hotel();
    const { body } = await bookHotel(v.roomTypeId, d(10), d(12)).expect(201);
    await pay(body.payment.providerOrderId as string);

    const preview = await t.http
      .get(`/v1/orders/${body.order.id as string}/cancellation`)
      .set(...bearer(user.token))
      .expect(200);
    expect(preview.body).toMatchObject({ allowed: true, refundPaise: 400_000, penaltyPaise: 0 });

    await t.http
      .post(`/v1/orders/${body.order.id as string}/cancel`)
      .set(...bearer(user.token))
      .set('Idempotency-Key', key())
      .send({ reasonCode: 'change_of_plans' })
      .expect(200);
    expect(await available(v.roomTypeId, d(10))).toBe(2);
    await drainPayments();
    const after = await order(body.order.id as string);
    expect(after).toMatchObject({ status: 'refunded', refundedPaise: 400_000 });
    const ledger = await ledgerFor(body.order.id as string);
    expect(ledger).toMatchObject({
      vendor_pending: 0,
      platform_revenue: 0,
      gst_payable: 0,
      refunds_payable: 0,
      platform_clearing: 0,
    });
    await expectLedgerBalanced();
  });

  it('charges the cancellation penalty close to check-in and pays the vendor their share', async () => {
    const v = await hotel();
    const { body } = await bookHotel(v.roomTypeId, d(1), d(2)).expect(201);
    await pay(body.payment.providerOrderId as string);
    const preview = await t.http
      .get(`/v1/orders/${body.order.id as string}/cancellation`)
      .set(...bearer(user.token))
      .expect(200);
    expect(preview.body).toMatchObject({ refundPaise: 100_000, penaltyPaise: 100_000 });

    await t.http
      .post(`/v1/orders/${body.order.id as string}/cancel`)
      .set(...bearer(user.token))
      .set('Idempotency-Key', key())
      .send({ reasonCode: 'change_of_plans' })
      .expect(200);
    await drainPayments();
    const after = await order(body.order.id as string);
    expect(after).toMatchObject({ status: 'cancelled', refundedPaise: 100_000 });
    // The retained ₹1,000 is re-split: 10% commission + 18% GST on it, rest payable to the vendor.
    expect(await ledgerFor(body.order.id as string)).toEqual({
      platform_clearing: -100_000,
      vendor_pending: 0,
      vendor_payable: 88_200,
      platform_revenue: 10_000,
      gst_payable: 1_800,
      refunds_payable: 0,
    });
    await expectLedgerBalanced();
  });

  it('runs vendor fulfilment through to an approved payout', async () => {
    const v = await hotel();
    const { body } = await bookHotel(v.roomTypeId, d(10), d(12)).expect(201);
    const id = body.order.id as string;
    await pay(body.payment.providerOrderId as string);

    await t.http
      .post(`/v1/vendors/${v.vendorId}/orders/${id}/complete`)
      .set(...bearer(user.token))
      .expect(404);
    const listed = await t.http
      .get(`/v1/vendors/${v.vendorId}/orders`)
      .set(...bearer(v.token))
      .expect(200);
    expect(listed.body.data.map((x: { id: string }) => x.id)).toEqual([id]);
    const accepted = await t.http
      .post(`/v1/vendors/${v.vendorId}/orders/${id}/accept`)
      .set(...bearer(v.token))
      .expect(200);
    expect(accepted.body.subStatus).toBe('accepted');
    await t.http
      .post(`/v1/vendors/${v.vendorId}/orders/${id}/start`)
      .set(...bearer(v.token))
      .expect(200);
    await t.http
      .post(`/v1/orders/${id}/cancel`)
      .set(...bearer(user.token))
      .set('Idempotency-Key', key())
      .send({ reasonCode: 'x_x' })
      .expect(409);
    await t.http
      .post(`/v1/vendors/${v.vendorId}/orders/${id}/complete`)
      .set(...bearer(v.token))
      .expect(200);
    expect(await ledgerFor(id)).toMatchObject({ vendor_pending: 0, vendor_payable: 352_800 });

    const earnings = await t.http
      .get(`/v1/vendors/${v.vendorId}/earnings`)
      .set(...bearer(v.token))
      .expect(200);
    expect(earnings.body).toMatchObject({
      payablePaise: 352_800,
      availableForPayoutPaise: 352_800,
      paidOutPaise: 0,
    });

    const run = await t.http
      .post('/v1/admin/payouts/run')
      .set(...bearer(admin))
      .expect(200);
    expect(run.body.created).toBe(1);
    const payouts = await t.http
      .get('/v1/admin/payouts?status=pending_approval')
      .set(...bearer(admin))
      .expect(200);
    const payoutId = payouts.body.data[0].id as string;
    expect(payouts.body.data[0].amountPaise).toBe(352_800);
    expect(
      (
        await t.http
          .post('/v1/admin/payouts/run')
          .set(...bearer(admin))
          .expect(200)
      ).body.created,
    ).toBe(0);

    await t.http
      .post(`/v1/admin/payouts/${payoutId}/approve`)
      .set(...bearer(admin))
      .set('Idempotency-Key', key())
      .expect(200);
    await drainQueue(t, 'payouts', PayoutsProcessor);
    const paid = await t.prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
    expect(paid.status).toBe('paid');
    expect(
      (await t.prisma.vendor.findUniqueOrThrow({ where: { id: v.vendorId } }))
        .razorpayLinkedAccountId,
    ).toMatch(/^acc_mock_/);

    const after = await t.http
      .get(`/v1/vendors/${v.vendorId}/earnings`)
      .set(...bearer(v.token))
      .expect(200);
    expect(after.body).toMatchObject({
      payablePaise: 0,
      availableForPayoutPaise: 0,
      paidOutPaise: 352_800,
    });

    const statement = await t.http
      .get(`/v1/vendors/${v.vendorId}/statement?month=${today.slice(0, 7)}`)
      .set(...bearer(v.token))
      .expect(200);
    expect(statement.headers['content-type']).toBe('application/pdf');
    expect(statement.body.subarray(0, 5).toString()).toBe('%PDF-');
    await expectLedgerBalanced();
  });

  it('refunds in full when the vendor rejects, and supports admin partial refunds after completion', async () => {
    const v = await hotel();
    const first = (await bookHotel(v.roomTypeId, d(10), d(11)).expect(201)).body;
    await pay(first.payment.providerOrderId as string);
    await t.http
      .post(`/v1/vendors/${v.vendorId}/orders/${first.order.id as string}/reject`)
      .set(...bearer(v.token))
      .set('Idempotency-Key', key())
      .send({ reason: 'Overbooked' })
      .expect(200);
    await drainPayments();
    expect((await order(first.order.id as string)).status).toBe('refunded');

    const second = (await bookHotel(v.roomTypeId, d(15), d(16)).expect(201)).body;
    await pay(second.payment.providerOrderId as string);
    await t.http
      .post(`/v1/admin/orders/${second.order.id as string}/refund`)
      .set(...bearer(admin))
      .set('Idempotency-Key', key())
      .send({ amountPaise: 50_000, reason: 'AC broken' })
      .expect(409);
    await t.http
      .post(`/v1/admin/orders/${second.order.id as string}/complete`)
      .set(...bearer(admin))
      .expect(200);
    await t.http
      .post(`/v1/admin/orders/${second.order.id as string}/refund`)
      .set(...bearer(admin))
      .set('Idempotency-Key', key())
      .send({ amountPaise: 500_000, reason: 'too much' })
      .expect(400);
    await t.http
      .post(`/v1/admin/orders/${second.order.id as string}/refund`)
      .set(...bearer(admin))
      .set('Idempotency-Key', key())
      .send({ amountPaise: 50_000, reason: 'AC broken' })
      .expect(200);
    await drainPayments();
    const after = await t.http
      .get(`/v1/admin/orders/${second.order.id as string}`)
      .set(...bearer(admin))
      .expect(200);
    expect(after.body).toMatchObject({ status: 'completed', refundedPaise: 50_000 });
    // ₹1,500 retained: commission ₹150 + GST ₹27; vendor ₹1,323.
    expect(await ledgerFor(second.order.id as string)).toMatchObject({
      vendor_payable: 132_300,
      platform_revenue: 15_000,
      gst_payable: 2_700,
      refunds_payable: 0,
    });
    await expectLedgerBalanced();
  });

  it('books cabs, food and experiences with their own rules', async () => {
    const cab = await createActiveVendor(t, {
      email: 'cab@ord.test',
      type: 'cab',
      cityId: fx.mathura,
      adminToken: admin,
    });
    await t.http
      .post(`/v1/vendors/${cab.vendorId}/vehicles`)
      .set(...bearer(cab.token))
      .send({ class: 'sedan', registrationNo: 'UP85AT1001', seats: 4, driverName: 'Ramesh' })
      .expect(201);
    await t.http
      .put(`/v1/vendors/${cab.vendorId}/cab-fares/sedan`)
      .set(...bearer(cab.token))
      .send({ baseFarePaise: 100_00, perKmPaise: 14_00, perMinPaise: 1_00, minFarePaise: 250_00 })
      .expect(200);
    const cabOrder = await book({
      type: 'cab',
      cab: {
        vendorId: cab.vendorId,
        vehicleClass: 'sedan',
        pickup: { lat: 27.5806, lng: 77.6996 },
        drop: { lat: 27.5717, lng: 77.6799 },
        pickupAt: istToUtc(d(1), 12, 0).toISOString(),
        passengers: 3,
      },
    }).expect(201);
    expect(cabOrder.body.order.totalPaise).toBe(250_00);
    await pay(cabOrder.body.payment.providerOrderId as string);
    const assigned = await t.http
      .post(`/v1/vendors/${cab.vendorId}/orders/${cabOrder.body.order.id as string}/accept`)
      .set(...bearer(cab.token))
      .expect(200);
    expect(assigned.body).toMatchObject({
      subStatus: 'driver_assigned',
      details: { cab: { vehicle: { registrationNo: 'UP85AT1001', driverName: 'Ramesh' } } },
    });
    await book({
      type: 'cab',
      cab: {
        vendorId: cab.vendorId,
        vehicleClass: 'suv',
        pickup: { lat: 27.58, lng: 77.69 },
        drop: { lat: 27.57, lng: 77.68 },
        pickupAt: istToUtc(d(1), 12, 0).toISOString(),
      },
    }).expect(409);

    const food = await createActiveVendor(t, {
      email: 'food@ord.test',
      type: 'restaurant',
      cityId: fx.vrindavan,
      adminToken: admin,
    });
    const r = await t.http
      .post(`/v1/vendors/${food.vendorId}/restaurants`)
      .set(...bearer(food.token))
      .send({
        cityId: fx.vrindavan,
        name: { en: 'Bhojanalaya' },
        lat: 27.58,
        lng: 77.69,
        acceptsOrders: true,
        isPublished: true,
      })
      .expect(201);
    const item = await t.http
      .post(`/v1/vendors/${food.vendorId}/restaurants/${r.body.id as string}/menu-items`)
      .set(...bearer(food.token))
      .send({ name: { en: 'Thali' }, category: 'thali', pricePaise: 220_00 })
      .expect(201);
    const foodOrder = await book({
      type: 'food',
      food: { restaurantId: r.body.id, items: [{ menuItemId: item.body.id, quantity: 2 }] },
    }).expect(201);
    expect(foodOrder.body.order.totalPaise).toBe(440_00);
    await pay(foodOrder.body.payment.providerOrderId as string);
    await t.http
      .post(`/v1/vendors/${food.vendorId}/orders/${foodOrder.body.order.id as string}/accept`)
      .set(...bearer(food.token))
      .expect(200);
    const refused = await t.http
      .post(`/v1/orders/${foodOrder.body.order.id as string}/cancel`)
      .set(...bearer(user.token))
      .set('Idempotency-Key', key())
      .send({ reasonCode: 'too_slow' })
      .expect(409);
    expect(refused.body.error.code).toBe('ORDER_NOT_CANCELLABLE');

    const exp = await createActiveVendor(t, {
      email: 'exp@ord.test',
      type: 'experience',
      cityId: fx.vrindavan,
      adminToken: admin,
    });
    const e = await t.http
      .post(`/v1/vendors/${exp.vendorId}/experiences`)
      .set(...bearer(exp.token))
      .send({
        cityId: fx.vrindavan,
        kind: 'boat_ride',
        title: { en: 'Boat ride' },
        pricePaise: 300_00,
        durationMin: 45,
        maxGroupSize: 8,
        isPublished: true,
      })
      .expect(201);
    const slots = await t.http
      .post(`/v1/vendors/${exp.vendorId}/experiences/${e.body.id as string}/slots`)
      .set(...bearer(exp.token))
      .send({ dates: [d(5)], times: ['06:30'], capacity: 8 })
      .expect(201);
    const slotId = slots.body[0].id as string;
    const expOrder = await book({ type: 'experience', experience: { slotId, seats: 3 } }).expect(
      201,
    );
    expect(expOrder.body.order.totalPaise).toBe(900_00);
    expect(
      (await t.prisma.experienceSlot.findUniqueOrThrow({ where: { id: slotId } })).booked,
    ).toBe(3);
    await t.http
      .post(`/v1/orders/${expOrder.body.order.id as string}/cancel`)
      .set(...bearer(user.token))
      .set('Idempotency-Key', key())
      .send({ reasonCode: 'change_of_plans' })
      .expect(200);
    expect(
      (await t.prisma.experienceSlot.findUniqueOrThrow({ where: { id: slotId } })).booked,
    ).toBe(0);
  });

  it('enforces the state machine and validation', async () => {
    const v = await hotel();
    const { body } = await bookHotel(v.roomTypeId, d(10), d(11)).expect(201);
    const id = body.order.id as string;
    const early = await t.http
      .post(`/v1/vendors/${v.vendorId}/orders/${id}/start`)
      .set(...bearer(v.token))
      .expect(404);
    expect(early.body.error.code).toBe('NOT_FOUND');
    await pay(body.payment.providerOrderId as string);
    const skip = await t.http
      .post(`/v1/admin/orders/${id}/refund`)
      .set(...bearer(admin))
      .set('Idempotency-Key', key())
      .send({ amountPaise: 1, reason: 'test' })
      .expect(409);
    expect(skip.body.error.code).toBe('REFUND_INVALID');

    await book({ type: 'hotel' }).expect(400);
    await book({
      type: 'hotel',
      hotel: { roomTypeId: v.roomTypeId, checkIn: d(3), checkOut: d(3), rooms: 1, guests: 1 },
    }).expect(400);
    await book({
      type: 'hotel',
      hotel: { roomTypeId: v.roomTypeId, checkIn: d(3), checkOut: d(4), rooms: 1, guests: 3 },
    }).expect(400);
    await t.http
      .post('/v1/orders')
      .set(...bearer(user.token))
      .send({ type: 'hotel' })
      .expect(400);
    const guest = await t.http.post('/v1/auth/firebase').send({ idToken: 'mock:guest:guest-o' });
    await t.http
      .post('/v1/orders')
      .set(...bearer(guest.body.accessToken as string))
      .set('Idempotency-Key', key())
      .send({})
      .expect(403);

    // Two travellers race for the last room: exactly one gets it.
    await t.prisma.$transaction((tx) =>
      t.app.get(InventoryFacade).holdRooms(tx, v.roomTypeId, [d(20)], 1),
    );
    const other = await signInMobile(t, 'yatri-2', '+919811122244');
    const [a, b] = await Promise.all([
      bookHotel(v.roomTypeId, d(20), d(21)),
      t.http
        .post('/v1/orders')
        .set(...bearer(other.token))
        .set('Idempotency-Key', key())
        .send({
          type: 'hotel',
          hotel: { roomTypeId: v.roomTypeId, checkIn: d(20), checkOut: d(21), rooms: 1, guests: 2 },
        }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });
});
