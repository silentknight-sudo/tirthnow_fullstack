import { type ActorType, type OrderStatus } from '@prisma/client';
import { allowedTargets, canTransition, ORDER_TRANSITIONS } from '../order-machine';

const STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'refunded',
];
const ACTORS: ActorType[] = ['user', 'vendor', 'admin', 'system', 'provider'];

describe('order state machine', () => {
  // Exhaustive: every from × to × actor combination is either explicitly allowed or rejected.
  const allowed = new Set<string>([
    'pending→confirmed:provider',
    'pending→confirmed:system',
    'pending→cancelled:user',
    'pending→cancelled:system',
    'pending→cancelled:admin',
    'confirmed→in_progress:vendor',
    'confirmed→in_progress:admin',
    'confirmed→completed:vendor',
    'confirmed→completed:admin',
    'confirmed→completed:system',
    'confirmed→cancelled:user',
    'confirmed→cancelled:vendor',
    'confirmed→cancelled:admin',
    'confirmed→cancelled:system',
    'in_progress→completed:vendor',
    'in_progress→completed:admin',
    'in_progress→completed:system',
    'in_progress→cancelled:admin',
    'completed→refunded:system',
    'completed→refunded:admin',
    'cancelled→refunded:system',
  ]);

  for (const from of STATUSES) {
    for (const to of STATUSES) {
      for (const actor of ACTORS) {
        const key = `${from}→${to}:${actor}`;
        it(`${key} is ${allowed.has(key) ? 'allowed' : 'rejected'}`, () => {
          expect(canTransition(from, to, actor)).toBe(allowed.has(key));
        });
      }
    }
  }

  it('has no transitions out of refunded and none back to pending', () => {
    expect(ORDER_TRANSITIONS.refunded).toBeUndefined();
    for (const from of STATUSES)
      for (const actor of ACTORS) expect(canTransition(from, 'pending', actor)).toBe(false);
  });

  it('lists the moves available to an actor', () => {
    expect(allowedTargets('confirmed', 'vendor').sort()).toEqual([
      'cancelled',
      'completed',
      'in_progress',
    ]);
    expect(allowedTargets('in_progress', 'user')).toEqual([]);
  });
});
