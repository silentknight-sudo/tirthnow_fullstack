import { MediaProcessor } from '../src/modules/files';
import { type CatalogFixture, seedCatalog } from './fixtures';
import {
  bearer,
  createTestApp,
  drainQueue,
  PDF_BYTES,
  resetState,
  signInMobile,
  type TestApp,
  uploadFile,
} from './helpers';

let keySeq = 0;
const key = () => `store-key-${Date.now()}-${++keySeq}`;

/** Temple Store, coupons and v2 pricing (ADR-0021), with vendors listed on KYC submit. */
describe('temple store and v2 pricing', () => {
  let t: TestApp;
  let fx: CatalogFixture;

  beforeAll(async () => {
    t = await createTestApp({ env: { PRICING_MODEL: 'v2', VENDOR_AUTO_APPROVE: 'true' } });
  });
  beforeEach(async () => {
    await resetState(t);
    fx = await seedCatalog(t.prisma);
  });
  afterAll(async () => {
    await t.close();
  });

  /** A phone-signed-in owner onboards a store; submit lists it at once (auto-approve). */
  async function storeVendor() {
    let owner = await signInMobile(
      t,
      `store-${++keySeq}`,
      `+9198700${String(keySeq).padStart(5, '0')}`,
    );
    const created = await t.http
      .post('/v1/vendors')
      .set(...bearer(owner.token))
      .send({
        type: 'store',
        legalName: 'Braj Pooja Bhandar',
        displayName: 'Braj Pooja Bhandar',
        pan: 'ABCDE1234F',
        cityId: fx.vrindavan,
      })
      .expect(201);
    const vendorId = created.body.id as string;
    expect(created.body.missingDocuments).toEqual(['pan', 'aadhaar', 'trade_license']);
    // Fresh token with the vendor claims.
    const refreshed = await t.http
      .post('/v1/auth/refresh')
      .send({ refreshToken: owner.refreshToken })
      .expect(200);
    owner = { ...owner, token: refreshed.body.accessToken as string };
    for (const docType of created.body.missingDocuments as string[]) {
      const { mediaId } = await uploadFile(t, owner.token, {
        purpose: 'kyc_document',
        mimeType: 'application/pdf',
        body: PDF_BYTES,
      });
      await drainQueue(t, 'media', MediaProcessor);
      await t.http
        .post(`/v1/vendors/${vendorId}/kyc-documents`)
        .set(...bearer(owner.token))
        .send({ docType, mediaId })
        .expect(201);
    }
    const submitted = await t.http
      .post(`/v1/vendors/${vendorId}/submit`)
      .set(...bearer(owner.token))
      .expect(200);
    expect(submitted.body.status).toBe('active');
    return { vendorId, token: owner.token };
  }

  const pay = async (providerOrderId: string) =>
    t.http
      .post('/v1/dev/payments/checkout')
      .send({ providerOrderId, outcome: 'success', deliverWebhook: true })
      .expect(200);

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

  it('lists products, prices them with GST + platform fee, applies coupons and splits the sale', async () => {
    const v = await storeVendor();
    const product = await t.http
      .post(`/v1/vendors/${v.vendorId}/products`)
      .set(...bearer(v.token))
      .send({ name: 'Pooja thali set', category: 'pooja_thali', pricePaise: 50_000, stock: 5 })
      .expect(201);
    // 500 + 18 % GST (90) + 5 % platform fee (25) = 615
    expect(product.body).toMatchObject({
      pricePaise: 50_000,
      displayPricePaise: 61_500,
      vendorName: 'Braj Pooja Bhandar',
    });
    await t.http
      .post(`/v1/vendors/${v.vendorId}/coupons`)
      .set(...bearer(v.token))
      .send({
        code: 'RADHE10',
        kind: 'percent',
        percentBps: 1000,
        minOrderPaise: 50_000,
        usageLimit: 1,
      })
      .expect(201);

    const catalog = await t.http.get('/v1/store/products?category=pooja_thali').expect(200);
    expect(catalog.body.map((p: { id: string }) => p.id)).toEqual([product.body.id]);
    expect((await t.http.get('/v1/store/categories').expect(200)).body).toEqual([
      { key: 'pooja_thali', count: 1 },
    ]);

    const user = await signInMobile(t, 'buyer-1', '+919811100001');
    const quote = await t.http
      .post('/v1/store/quote')
      .set(...bearer(user.token))
      .send({ vendorId: v.vendorId, basePaise: 100_000, couponCode: 'RADHE10' })
      .expect(200);
    // 1000 − 100 = 900; GST 162; fee 45; total 1107
    expect(quote.body).toEqual({
      basePaise: 100_000,
      discountPaise: 10_000,
      taxPaise: 16_200,
      feePaise: 4_500,
      totalPaise: 110_700,
      couponCode: 'RADHE10',
      couponError: null,
    });

    const res = await t.http
      .post('/v1/orders')
      .set(...bearer(user.token))
      .set('Idempotency-Key', key())
      .send({
        type: 'product',
        couponCode: 'RADHE10',
        product: {
          items: [{ productId: product.body.id, quantity: 2 }],
          mode: 'delivery',
          address: {
            name: 'Radha Sharma',
            phoneE164: '+919811100001',
            line1: 'Room 12, Radha Niwas, Raman Reti',
            city: 'Vrindavan',
            pincode: '281121',
          },
        },
      })
      .expect(201);
    const o = res.body.order;
    expect(o).toMatchObject({
      type: 'product',
      subtotalPaise: 100_000,
      discountPaise: 10_000,
      taxPaise: 16_200,
      feePaise: 4_500,
      totalPaise: 110_700,
    });
    expect(
      (await t.prisma.product.findUniqueOrThrow({ where: { id: product.body.id } })).stock,
    ).toBe(3);

    // The coupon was single-use.
    const again = await t.http
      .post('/v1/store/quote')
      .set(...bearer(user.token))
      .send({ vendorId: v.vendorId, basePaise: 100_000, couponCode: 'RADHE10' })
      .expect(200);
    expect(again.body.couponError).toBe('This coupon has been fully used');

    await pay(res.body.payment.providerOrderId as string);
    const confirmed = await t.http
      .get(`/v1/orders/${o.id as string}`)
      .set(...bearer(user.token))
      .expect(200);
    expect(confirmed.body.status).toBe('confirmed');
    // The platform keeps its 5 % fee; the vendor gets base − discount + GST.
    expect(await ledgerFor(o.id as string)).toEqual({
      platform_clearing: -110_700,
      vendor_pending: 106_200,
      platform_revenue: 4_500,
    });

    const analytics = await t.http
      .get(`/v1/vendors/${v.vendorId}/analytics?days=7`)
      .set(...bearer(v.token))
      .expect(200);
    expect(analytics.body).toMatchObject({
      ordersCount: 1,
      grossPaise: 110_700,
      earningsPaise: 106_200,
      discountsPaise: 10_000,
      ratingCount: 0,
    });
    expect(analytics.body.daily).toHaveLength(7);
    expect(analytics.body.topItems).toEqual([
      { name: 'Pooja thali set', quantity: 2, salesPaise: 100_000 },
    ]);
  });

  it('returns stock and the coupon when an unpaid order is cancelled, and refuses out-of-stock orders', async () => {
    const v = await storeVendor();
    const product = await t.http
      .post(`/v1/vendors/${v.vendorId}/products`)
      .set(...bearer(v.token))
      .send({ name: 'Diya set', category: 'diya_dhoop', pricePaise: 20_000, stock: 2 })
      .expect(201);
    await t.http
      .post(`/v1/vendors/${v.vendorId}/coupons`)
      .set(...bearer(v.token))
      .send({ code: 'DIYA50', kind: 'flat', flatPaise: 5_000, usageLimit: 1 })
      .expect(201);
    const user = await signInMobile(t, 'buyer-2', '+919811100002');
    const book = (qty: number, coupon?: string) =>
      t.http
        .post('/v1/orders')
        .set(...bearer(user.token))
        .set('Idempotency-Key', key())
        .send({
          type: 'product',
          ...(coupon ? { couponCode: coupon } : {}),
          product: { items: [{ productId: product.body.id, quantity: qty }], mode: 'pickup' },
        });

    await book(3).expect(409);
    const res = await book(2, 'DIYA50').expect(201);
    expect(res.body.order.discountPaise).toBe(5_000);
    await t.http
      .post(`/v1/orders/${res.body.order.id as string}/cancel`)
      .set(...bearer(user.token))
      .set('Idempotency-Key', key())
      .send({ reasonCode: 'change_of_plans' })
      .expect(200);
    expect(
      (await t.prisma.product.findUniqueOrThrow({ where: { id: product.body.id } })).stock,
    ).toBe(2);
    expect((await t.prisma.coupon.findFirstOrThrow({ where: { code: 'DIYA50' } })).usedCount).toBe(
      0,
    );
  });

  it('separates dharamshalas from hotels under Stay', async () => {
    const owner = await signInMobile(t, 'dharam-1', '+919811100003');
    const vendor = await t.http
      .post('/v1/vendors')
      .set(...bearer(owner.token))
      .send({
        type: 'dharamshala',
        legalName: 'Shri Radha Seva Trust',
        displayName: 'Radha Seva Dharamshala',
        pan: 'ABCDE1234F',
      })
      .expect(201);
    expect(vendor.body.missingDocuments).toEqual(['pan', 'aadhaar', 'trade_license']);
    // Not approved yet → cannot publish; drafts can still be prepared.
    const refreshed = await t.http
      .post('/v1/auth/refresh')
      .send({ refreshToken: owner.refreshToken })
      .expect(200);
    const token = refreshed.body.accessToken as string;
    const h = await t.http
      .post(`/v1/vendors/${vendor.body.id as string}/hotels`)
      .set(...bearer(token))
      .send({
        cityId: fx.vrindavan,
        name: { en: 'Radha Seva Dharamshala' },
        lat: 27.58,
        lng: 77.7,
        address: 'Parikrama Marg, Vrindavan',
      })
      .expect(201);
    expect(h.body.kind).toBe('dharamshala');
  });
});
