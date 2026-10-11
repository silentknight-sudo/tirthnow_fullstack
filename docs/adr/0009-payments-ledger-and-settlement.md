# ADR-0009: Double-entry ledger, settlement and refunds

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Money moves from travellers to the platform (Razorpay captures), from the platform
to vendors (Route transfers) and back to travellers (refunds), often partially and
out of order: webhooks arrive late or twice, a capture can land after the hold
expired, a vendor may already have been paid when a refund is issued. Finance needs
balances it can trust and an audit trail that cannot be edited.

## Decision

- An append-only, double-entry `ledger_entries` table (ADR-0008 trigger keeps every
  transaction balanced; UPDATE/DELETE are blocked). Amounts are integer paise.
- Accounts: `platform_clearing` (gateway money), `vendor_pending` (sold, service not
  yet delivered), `vendor_payable` (earned, owed to the vendor), `platform_revenue`,
  `gst_payable` (GST on our commission), `refunds_payable`.
- Postings:
  | Event | Debit | Credit |
  |---|---|---|
  | Order confirmed (sale) | clearing | vendor_pending, revenue, gst |
  | Service completed / order cancelled (settle) | vendor_pending | vendor_payable |
  | Refund initiated | the sale split re-computed on the retained amount (deltas) | refunds_payable |
  | Refund processed (gateway) | refunds_payable | clearing |
  | Capture for an already-cancelled order | clearing | refunds_payable |
  | Payout paid | vendor_payable | clearing |
- A refund never reverses entries; it re-splits what the platform keeps (e.g. a
  cancellation penalty is commissioned like a sale) and posts the difference.
- Webhooks are verified on the raw body before anything is stored (forged events can
  never claim an event id), recorded once (`payment_events` unique id), and processed
  under a row lock; `processed_at` makes re-delivery a no-op.
- Gateway calls that move money (refunds, transfers) run on queues with a stable job
  id; the row status (`pending → processed/failed`) is the source of truth.
- Mock refunds complete immediately (as most Razorpay refunds do); `holdRefunds`
  simulates bank-delayed refunds that complete by webhook.

## Alternatives considered

- Status columns only (no ledger): cannot answer "what do we owe vendor X today"
  once partial refunds and penalties exist.
- Reversing the full sale and re-posting: more rows, harder to read in statements.
- Third-party ledger service: an extra dependency for volumes Postgres handles easily.

## Consequences

- Vendor statements and earnings are queries over the ledger.
- A refund after a payout can drive `vendor_payable` negative; the next payout nets it.
- Every new money flow must add a posting here, with a test that checks the ledger
  stays balanced.
