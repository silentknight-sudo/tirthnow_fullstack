import { type ActorType, type OrderStatus } from '@prisma/client';

/**
 * The single order state machine (ADR-0004). `ORDER_TRANSITIONS[from][to]` lists who may make
 * the move; anything not listed is illegal. Side effects live in OrderTransitionService.
 *
 *   pending ──► confirmed ──► in_progress ──► completed ──► refunded
 *      │            │              │                          ▲
 *      └──► cancelled ◄───────────┘ (admin)      cancelled ───┘
 */
export const ORDER_TRANSITIONS: Readonly<
  Partial<Record<OrderStatus, Partial<Record<OrderStatus, readonly ActorType[]>>>>
> = {
  pending: {
    confirmed: ['provider', 'system'],
    cancelled: ['user', 'system', 'admin'],
  },
  confirmed: {
    in_progress: ['vendor', 'admin'],
    completed: ['vendor', 'admin', 'system'],
    cancelled: ['user', 'vendor', 'admin', 'system'],
  },
  in_progress: {
    completed: ['vendor', 'admin', 'system'],
    cancelled: ['admin'],
  },
  completed: {
    refunded: ['system', 'admin'],
  },
  cancelled: {
    refunded: ['system'],
  },
};

export const TERMINAL: ReadonlySet<OrderStatus> = new Set(['refunded']);

export function canTransition(from: OrderStatus, to: OrderStatus, actor: ActorType): boolean {
  return ORDER_TRANSITIONS[from]?.[to]?.includes(actor) ?? false;
}

export function allowedTargets(from: OrderStatus, actor: ActorType): OrderStatus[] {
  const targets = ORDER_TRANSITIONS[from] ?? {};
  return (Object.keys(targets) as OrderStatus[]).filter((to) => targets[to]?.includes(actor));
}
