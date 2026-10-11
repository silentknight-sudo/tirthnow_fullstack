import { createHmac } from 'node:crypto';
import { loadConfig } from '../../../config';
import { MockPaymentAdapter } from '../mock.adapter';
import { RazorpayAdapter } from '../razorpay.adapter';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'x'.repeat(40),
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 2).toString('base64'),
};

describe('RazorpayAdapter signatures and webhook parsing', () => {
  const adapter = new RazorpayAdapter(
    loadConfig({
      ...base,
      PAYMENT_PROVIDER: 'razorpay',
      RAZORPAY_KEY_ID: 'rzp_test_key',
      RAZORPAY_KEY_SECRET: 'key-secret',
      RAZORPAY_WEBHOOK_SECRET: 'hook-secret',
    }),
  );

  it('verifies checkout signatures as HMAC(order|payment, key secret)', () => {
    const signature = createHmac('sha256', 'key-secret').update('order_1|pay_1').digest('hex');
    expect(
      adapter.verifyPaymentSignature({
        providerOrderId: 'order_1',
        providerPaymentId: 'pay_1',
        signature,
      }),
    ).toBe(true);
    expect(
      adapter.verifyPaymentSignature({
        providerOrderId: 'order_1',
        providerPaymentId: 'pay_2',
        signature,
      }),
    ).toBe(false);
    expect(
      adapter.verifyPaymentSignature({
        providerOrderId: 'order_1',
        providerPaymentId: 'pay_1',
        signature: 'short',
      }),
    ).toBe(false);
  });

  it('verifies webhook signatures over the raw body', () => {
    const body = Buffer.from('{"event":"payment.captured"}');
    const sig = createHmac('sha256', 'hook-secret').update(body).digest('hex');
    expect(adapter.verifyWebhookSignature(body, sig)).toBe(true);
    expect(adapter.verifyWebhookSignature(Buffer.from('{"event":"payment.captured" }'), sig)).toBe(
      false,
    );
  });

  it('normalises payment, refund and unknown events', () => {
    const captured = Buffer.from(
      JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: { entity: { id: 'pay_9', order_id: 'order_9', amount: 4500, method: 'upi' } },
        },
      }),
    );
    expect(adapter.parseWebhook(captured, { 'x-razorpay-event-id': 'evt_1' })).toMatchObject({
      eventId: 'evt_1',
      event: {
        kind: 'payment.captured',
        providerOrderId: 'order_9',
        providerPaymentId: 'pay_9',
        amountPaise: 4500,
        method: 'upi',
      },
    });
    const refund = Buffer.from(
      JSON.stringify({
        event: 'refund.processed',
        payload: { refund: { entity: { id: 'rfnd_1', payment_id: 'pay_9', amount: 1000 } } },
      }),
    );
    expect(adapter.parseWebhook(refund, { 'x-razorpay-event-id': 'evt_2' }).event).toEqual({
      kind: 'refund.processed',
      providerRefundId: 'rfnd_1',
      providerPaymentId: 'pay_9',
      amountPaise: 1000,
    });
    const other = Buffer.from(JSON.stringify({ event: 'order.paid', payload: {} }));
    expect(adapter.parseWebhook(other, { 'x-razorpay-event-id': 'evt_3' }).event).toEqual({
      kind: 'ignored',
      type: 'order.paid',
    });
    expect(() => adapter.parseWebhook(other, {})).toThrow(/Event-Id/);
  });
});

describe('MockPaymentAdapter', () => {
  const mock = new MockPaymentAdapter(loadConfig(base));

  it('simulates checkout with Razorpay-style signatures, failing amounts ending in 13 paise', async () => {
    const ok = await mock.createOrder({ amountPaise: 10_000 });
    const paid = mock.checkout(ok.providerOrderId);
    expect(paid.captured).toBe(true);
    expect(
      mock.verifyPaymentSignature({
        providerOrderId: ok.providerOrderId,
        providerPaymentId: paid.providerPaymentId,
        signature: paid.signature,
      }),
    ).toBe(true);
    expect((await mock.fetchPayment(paid.providerPaymentId)).status).toBe('captured');

    const bad = await mock.createOrder({ amountPaise: 10_013 });
    expect(mock.checkout(bad.providerOrderId).captured).toBe(false);
  });

  it('signs and parses its own webhooks', () => {
    const { body, signature } = mock.webhook(
      { kind: 'transfer.processed', providerTransferId: 'trf_1' },
      'evt_x',
    );
    expect(mock.verifyWebhookSignature(body, signature)).toBe(true);
    expect(mock.parseWebhook(body)).toMatchObject({
      eventId: 'evt_x',
      eventType: 'transfer.processed',
    });
  });
});
