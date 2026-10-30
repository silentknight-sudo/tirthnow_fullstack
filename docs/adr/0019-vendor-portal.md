# ADR-0019: Vendor portal as a static client of the API

- **Status:** Accepted
- **Date:** 2026-10-30

## Context

Phase 4 delivers the partner portal. The API already exposes every vendor endpoint
(184 paths) with an OpenAPI document. Open questions: how the portal renders and is
hosted, how it gets typed API access, where tokens live, and how new vendors get an
account (portal login was email + password, but there was no sign-up).

## Decision

- **Static export, client-side data.** Next.js 14 App Router with `output: 'export'`;
  all pages are client components using TanStack Query. It hosts anywhere static
  files can be served (Vercel, Cloudflare Pages, S3) and needs no Node server.
  Detail pages use query strings (`/orders/view/?id=…`) because static export cannot
  pre-render dynamic ids.
- **Typed client from OpenAPI.** `packages/api-client` generates `src/schema.ts` with
  `openapi-typescript` and wraps `openapi-fetch`: bearer token, `Accept-Language`, one
  shared refresh for concurrent 401s (refresh tokens rotate, ADR-0002) and an
  `ApiError` for every non-2xx. CI fails when the schema is stale. Endpoints whose
  responses were undocumented (vendor payouts, reviews, cab fares) now carry response
  types.
- **Sign-up.** New `POST /v1/auth/portal/register` (email, password, name) creates a
  `user`-role account and signs it in; vendor roles still come only from onboarding
  (`POST /v1/vendors`), after which the portal refreshes its token (ADR-0014).
- **Tokens in `localStorage`.** The API returns tokens in the response body, so the
  portal keeps them in `localStorage` to survive reloads. Accepted risk: an XSS bug
  could read them. Mitigations: React escaping, no `dangerouslySetInnerHTML`, no
  third-party scripts besides Google Fonts, 15-minute access tokens with rotating
  refresh tokens and reuse detection. Revisit with an httpOnly cookie session if the
  portal moves to the API's domain (Phase 6).
- **UI kit in the app.** Tailwind with the ADR-0018 tokens and a small component file
  (`components/ui.tsx`). `packages/ui` stays a placeholder until the admin portal
  needs the same components; then they move there.
- **Forms** use React Hook Form + Zod with the API's own rules (PAN, GSTIN, IFSC,
  password); money is typed in rupees and sent as integer paise.

## Alternatives considered

- **Server-rendered Next.js with a cookie session (BFF).** Safer token storage, but
  needs a Node host and a session proxy for every call; more moving parts for Phase 4.
- **Hand-written fetch wrappers.** Rejected: 60 vendor endpoints would drift from
  the API.

## Consequences

- After an API change: `openapi:export`, then `pnpm --filter @tirth-now/api-client
  generate`, then fix type errors in the portal.
- `NEXT_PUBLIC_API_BASE_URL` is fixed at build time; each environment needs its own
  build, and the API's `CORS_ORIGINS` must list the portal origin.
