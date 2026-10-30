# @tirth-now/vendor-portal

Partner portal for hotels and dharamshalas, cab operators, restaurants and experience
hosts. Next.js 14 (App Router) built as a static site; every page talks to the API
from the browser through `@tirth-now/api-client`. Design: [ADR-0019](../../docs/adr/0019-vendor-portal.md).

## Run it

```bash
pnpm setup && pnpm dev                       # API on :4000 (repo root)
cd apps/vendor-portal
pnpm dev                                     # http://localhost:3001
```

Seeded accounts (password `TirthNow@Vendor123`, or `SEED_VENDOR_PASSWORD`):
`hotel.owner@tirthnow.local` (stays) and `cabs.owner@tirthnow.local` (cabs + food).
New partners use **Become a partner**.

`NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000`) is baked in at build
time; the API's `CORS_ORIGINS` must include the portal's origin.

## What it covers

| Area | Pages |
|---|---|
| Account | Sign in (emailed OTP when MFA is on), sign up, forgot/reset password |
| Onboarding | Business type, names, city, PAN/GSTIN → KYC upload, bank account, submit for review |
| Bookings | Dashboard queue, list with filters, detail with history; accept, reject, start, complete, cancel |
| Listings | Stays + room types, room calendar (price, rooms, closed dates, weekdays), restaurants + menu, vehicles + fares, experiences + slots |
| Money | Earnings, payouts, monthly statement PDF |
| Other | Review replies, team members with permissions, multiple businesses per login |

Pages and buttons follow the user's vendor permissions (`orders.manage`,
`listings.edit`, `inventory.edit`, `finance.view`, `reviews.reply`); the API enforces
the same rules.

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm build
pnpm e2e        # Playwright against the built portal on :3001 and a seeded API on :4000
```
