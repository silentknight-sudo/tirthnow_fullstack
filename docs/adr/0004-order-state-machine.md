# ADR-0004: Single order table and state machine for all booking types

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Users book hotels, cabs, food, experiences and (later) transit. Vendors and
admins need one orders view; payments, refunds, commission and payouts must work
identically regardless of type. Status changes come from users, vendors,
admins, the payment provider (webhooks) and system jobs (hold expiry), often
concurrently.

## Decision

- One `orders` table with `type` discriminator, `order_items` for line items and
  a `details` JSONB snapshot for type-specific data.
- One status enum: `pending → confirmed → in_progress → completed`, plus
  `cancelled` and `refunded` (see diagram in `docs/ARCHITECTURE.md` §4).
- Transitions declared in a single typed table
  `ORDER_TRANSITIONS: Record<from, Partial<Record<to, { actors, guard?, effects }>>>`.
  Type-specific behaviour is expressed as guards/effects keyed by `order.type`
  (e.g. food may auto-confirm on capture; hotel requires vendor accept unless
  instant-book).
- `OrdersService.transition()` is the only writer of `orders.status`. It:
  1. locks the row (`SELECT … FOR UPDATE`),
  2. validates `from → to` and actor,
  3. runs the guard,
  4. updates status, inserts `order_status_history`,
  5. commits, then emits `order.<to>` events for side effects (notifications,
     realtime, ledger, inventory release).
- Illegal transitions throw `ORDER_INVALID_TRANSITION` (409). Repeated identical
  transitions (e.g. duplicate webhook) are no-ops, not errors.
- Inventory is held at `pending` with `hold_expires_at` (15 min default); a
  repeatable job cancels expired holds.

## Alternatives considered

- **Per-type order tables and state machines.** Rejected: duplicated payment,
  refund, payout and reporting logic.
- **A state-machine library (XState).** Rejected for the backend: the machine is
  small and a typed transition table is easier to test exhaustively and to
  read in review. Revisit if sub-states (e.g. cab: driver_assigned, arrived)
  grow — those are modeled in `details.sub_status` for now, not top-level
  states.
- **Event-sourced orders.** Rejected: `order_status_history` gives the audit
  trail without the operational complexity.

## Consequences

- Exhaustive unit tests are straightforward: iterate all `from × to × actor`.
- Type-specific sub-states (cab driver arrived, food out for delivery) live in
  `details.sub_status` and do not change payment semantics.
- Adding a new product type means: new item type, inventory hold strategy,
  guards/effects entries — no new tables for orders or payments.
