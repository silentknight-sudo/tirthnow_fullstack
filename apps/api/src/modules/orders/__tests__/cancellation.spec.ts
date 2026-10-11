import { quoteCancellation } from '../cancellation';

const now = new Date('2026-10-11T06:30:00Z');
const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000);
const base = {
  type: 'hotel' as const,
  status: 'confirmed' as const,
  actor: 'user' as const,
  refundablePaise: 400_000,
  serviceStartsAt: inHours(72),
  vendorAccepted: false,
  policy: { freeUntilHoursBefore: 48, penaltyPctAfter: 50, noShowPct: 100 },
  now,
};

describe('quoteCancellation', () => {
  it('refunds in full inside the free window', () => {
    expect(quoteCancellation(base)).toMatchObject({
      allowed: true,
      refundPaise: 400_000,
      penaltyPaise: 0,
    });
  });

  it('charges the penalty after the free window and the no-show charge after start', () => {
    expect(quoteCancellation({ ...base, serviceStartsAt: inHours(10) })).toMatchObject({
      refundPaise: 200_000,
      penaltyPaise: 200_000,
    });
    expect(quoteCancellation({ ...base, serviceStartsAt: inHours(-1) })).toMatchObject({
      refundPaise: 0,
      penaltyPaise: 400_000,
    });
  });

  it('rounds the penalty down so refunds never lose a paisa to rounding', () => {
    const q = quoteCancellation({
      ...base,
      refundablePaise: 999,
      serviceStartsAt: inHours(1),
      policy: { freeUntilHoursBefore: 24, penaltyPctAfter: 33, noShowPct: 100 },
    });
    expect(q.penaltyPaise + q.refundPaise).toBe(999);
    expect(q.penaltyPaise).toBe(329);
  });

  it('refunds in full when the vendor, admin or system cancels', () => {
    for (const actor of ['vendor', 'admin', 'system'] as const) {
      expect(quoteCancellation({ ...base, actor, serviceStartsAt: inHours(-5) }).refundPaise).toBe(
        400_000,
      );
    }
  });

  it('lets food orders be cancelled only before the restaurant accepts', () => {
    expect(quoteCancellation({ ...base, type: 'food' }).refundPaise).toBe(400_000);
    expect(quoteCancellation({ ...base, type: 'food', vendorAccepted: true }).allowed).toBe(false);
  });

  it('refuses users once the service is under way or finished', () => {
    expect(quoteCancellation({ ...base, status: 'in_progress' }).allowed).toBe(false);
    expect(quoteCancellation({ ...base, status: 'completed', actor: 'admin' }).allowed).toBe(false);
    expect(quoteCancellation({ ...base, status: 'in_progress', actor: 'admin' }).allowed).toBe(
      true,
    );
  });
});
