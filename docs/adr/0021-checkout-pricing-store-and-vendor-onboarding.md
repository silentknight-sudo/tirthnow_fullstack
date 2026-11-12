# ADR-0021: Checkout pricing (GST + platform fee), Temple Store and vendor onboarding

- **Status:** Accepted
- **Date:** 2026-11-12
- **Supersedes (for new orders):** the pricing part of ADR-0010

## Context

The client wants vendors to set their own base prices, with **18 % GST and a 5 % platform
charge added on top** at checkout. Vendors also need coupons, a Temple Store where they sell
pooja items, separate Hotel and Dharamshala listings under Stay, and bike / car / auto cabs.
Vendors should be listed only after admin approval, but the admin panel is not built yet.

## Decision

- **Price = base − coupon + GST + platform fee.** GST (`SALE_GST_BPS`, default 1800) and the
  platform fee (`PLATFORM_FEE_BPS`, default 500) are both computed on the discounted base and
  stored on the order (`tax_paise`, `fee_paise`, `discount_paise`). Listings show
  `displayPricePaise` = base + GST + fee. `core/pricing` holds the pure functions.
- **Ledger split for these orders (`details.pricing = 'v2'`):** the platform keeps exactly the
  fee (`platform_revenue`); the vendor gets base − discount + GST (`vendor_pending`) and remits
  the GST on its supply. No commission rule is applied.
- `PRICING_MODEL=commission` keeps the ADR-0010 model (used by the older e2e suites).
- **Coupons** belong to a vendor (`coupons`), percent or flat, with min order, max discount,
  validity window and usage limit. Redeemed inside the order transaction (atomic `used_count`
  increment); released when an unpaid order is cancelled. `POST /v1/store/quote` previews a
  price breakdown.
- **Temple Store**: `products` owned by `store` vendors; stock is held when the order is
  created and returned on cancellation; one store per order (the app keeps one store per cart).
  Order type `product`, with delivery address or pickup.
- **Stay**: `hotels.kind` = `hotel | dharamshala`; vendor type `dharamshala` defaults its
  listings to `dharamshala`; `GET /v1/hotels?kind=` filters.
- **Cabs**: vehicle class `bike` added (car = hatchback/sedan/suv, plus auto, e-rickshaw).
- **KYC**: PAN and Aadhaar for everyone, plus GST (if registered), trade licence (hotel,
  dharamshala, store), FSSAI (restaurant), RC and driving licence (cab).
- **Approval on hold**: with `VENDOR_AUTO_APPROVE=true` (default until the admin panel ships)
  a complete KYC submission makes the vendor `active` at once; documents stay `pending` for a
  later admin review. Set it to `false` to require admin approval (the vendor app then shows
  “Waiting for approval”).
- **Vendor analytics**: `GET /v1/vendors/:vid/analytics?days=7|30|90` returns orders,
  gross, earnings (gross − fee), discounts, daily series, top items and the rating summary.

## Consequences

- GST is a flat 18 % for every service as requested; real rates differ (e.g. 5 % on
  restaurant food, 12 % on rooms under ₹7,500). Per-category rates are one config change away
  (`SALE_GST_BPS` → a map) once the client's CA confirms them.
- Tax invoices to customers are a Phase 6 task.
