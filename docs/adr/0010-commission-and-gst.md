# ADR-0010: Commission rules and GST on commission

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The platform earns a commission per booking that can vary by vendor (launch
partners), city and booking type. Indian GST applies to the platform's commission
(a service it sells to the vendor). Traveller-facing prices must be simple.

## Decision

- Listing prices are **tax-inclusive** for the traveller; GST on the underlying service
  (room, ride, meal) is the vendor's responsibility and is not split by the platform.
- Commission = `round(gross × percent_bps / 10 000) + flat_paise`, clamped to the rule's
  `min_paise`/`max_paise` and never above the gross.
- GST on commission = `round(commission × PLATFORM_GST_BPS / 10 000)` (default 18 %),
  deducted from the vendor share with the commission; it is posted to `gst_payable`.
- Rule selection: active, in-date rules matching the order; most specific wins
  (vendor > city > order type > global), then `priority`, then newest. The chosen rule
  id and commission are stored on the order at confirmation.
- Admins manage rules via `/v1/admin/commission-rules`; changes affect new orders only.

## Alternatives considered

- Exclusive pricing with GST shown at checkout: more accurate per line, but needs each
  vendor's GST registration status and rates; deferred until invoices are needed.
- Commission charged as a separate vendor invoice: same economics, extra reconciliation.

## Consequences

- Vendor share = gross − commission − GST on commission; tested in `split.spec.ts`.
- Tax invoices for commission (GSTR-1) are a Phase 6 reporting task.
