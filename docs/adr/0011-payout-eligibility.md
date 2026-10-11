# ADR-0011: Payout eligibility and approval

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Vendors want to be paid quickly; the platform must keep enough to cover refunds and
disputes raised shortly after a service, and must not pay twice.

## Decision

- Money becomes payable when the service is completed (or the order is cancelled with
  a retained penalty) — never at booking.
- Eligible amount = `vendor_payable` credits older than `PAYOUT_SETTLEMENT_HOLD_DAYS`
  (default 3) minus all debits, minus payouts already in flight. Below
  `PAYOUT_MIN_PAISE` nothing is scheduled.
- A daily job (02:00 IST, advisory-locked per vendor) creates `pending_approval`
  payouts; an admin approves (Idempotency-Key) or holds. Approval queues the transfer.
- The Razorpay Route linked account is created lazily on the first payout from the
  vendor's verified primary bank account.
- `paid` is recorded from the transfer result or the `transfer.processed` webhook,
  whichever comes first; the ledger posting happens exactly once.

## Alternatives considered

- Instant settlement via Route on capture: no protection against refunds after service.
- Weekly batches: simpler for finance, slower for small vendors who need cash flow.

## Consequences

- Vendors see `pendingServicePaise`, `payablePaise`, `availableForPayoutPaise` and
  `inFlightPayoutsPaise` in their earnings.
- Hold days and minimum are env-configurable; changing them needs no migration.
