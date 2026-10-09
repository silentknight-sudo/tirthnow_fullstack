# Phase 1 — Foundation: Completion Report

| | |
|---|---|
| **Status** | Complete |
| **Completed** | 9 October 2026 |
| **Branch** | `claude/peaceful-fermi-hvmzt4` |
| **Commits** | `f5f2e0e` … `4db65bc` (6 commits on top of Phase 0 `e851636`) |
| **Next** | Phase 2 — Backend modules |

## 1. Summary

Phase 1 delivers the foundation every later phase builds on: a pnpm + Turborepo
monorepo with shared tooling, local infrastructure, a production-shaped NestJS
API skeleton, the complete database schema with a realistic seed, full
authentication for mobile and portal users, and a CI pipeline.

The whole system runs locally with **zero external accounts** — Firebase and
email use mock adapters selected by environment variables.

### Verification at sign-off

All checks were run on the final commit against PostgreSQL 16 + pgvector and Redis 7.

| Check | Command | Result |
|---|---|---|
| Formatting | `pnpm format:check` | ✅ clean |
| Lint (type-aware, strict) | `pnpm lint` | ✅ 0 errors, 0 warnings |
| Type-check | `pnpm typecheck` | ✅ |
| Unit tests | `pnpm test` | ✅ 56 passed (API 52, shared-types 4) |
| Migration drift | `pnpm --filter @tirth-now/api db:check` | ✅ in sync |
| API end-to-end tests | `pnpm test:e2e` | ✅ 33 passed |
| Seed (run twice) | `pnpm db:seed` | ✅ idempotent |
| Production build | `pnpm build` | ✅ API and worker boot from `dist/` |

## 2. Scope delivered

Checked against the Phase 1 brief.

| Requirement | Status | Where |
|---|---|---|
| Turborepo + pnpm wiring | ✅ | `package.json`, `pnpm-workspace.yaml`, `turbo.json` |
| Shared configs (ESLint, tsconfig, Prettier) | ✅ | `packages/config` |
| Husky + lint-staged | ✅ | `.husky/`, `.lintstagedrc.cjs` |
| Conventional commits | ✅ | `commitlint.config.cjs`, `commit-msg` hook, CI job |
| docker-compose: Postgres + pgvector, Redis, MinIO, Mailpit | ✅ | `infra/docker/docker-compose.yml` |
| Config module with Zod-validated env | ✅ | `apps/api/src/core/config` |
| Prisma module | ✅ | `apps/api/src/core/prisma` |
| Health check | ✅ | `GET /healthz`, `GET /readyz` |
| Global exception filter | ✅ | `apps/api/src/core/http/all-exceptions.filter.ts` |
| Request ID + pino logging | ✅ | `apps/api/src/core/logging` |
| Rate limiting (throttler + Redis) | ✅ | `apps/api/src/core/throttle` |
| Helmet, CORS | ✅ | `apps/api/src/app.setup.ts` |
| Swagger at `/docs` | ✅ | `apps/api/src/app.setup.ts` |
| Prisma schema for the full data model | ✅ | 61 tables, 36 enums — `apps/api/prisma/schema.prisma` |
| First migration | ✅ | `apps/api/prisma/migrations/20261009065213_init` |
| Seed: 5 temples per city with aarti times | ✅ | 6 cities × 5 temples, 132 aarti schedules, 14 POIs |
| Seed: sample hotels / cabs / restaurants | ✅ | 2 hotels, 6 room types, 360 room-nights, 3 vehicles, 3 fare classes, 1 restaurant (8 dishes), 1 experience (28 slots) |
| Seed: 1 admin, 2 vendors, demo user | ✅ | see §5 |
| Auth: Firebase token exchange | ✅ | `POST /v1/auth/firebase` |
| Auth: portal login (+ optional OTP) | ✅ | `POST /v1/auth/portal/login`, `/portal/otp/verify` |
| Auth: refresh rotation | ✅ | `POST /v1/auth/refresh` |
| Auth: logout | ✅ | `POST /v1/auth/logout` |
| RBAC guards + `@Roles()` | ✅ | `apps/api/src/core/auth` |
| CI: lint, type-check, test, build on every PR | ✅ | `.github/workflows/ci.yml` |

Also delivered beyond the brief: password reset for portal users, `GET /v1/me`,
a separate worker entrypoint, two custom lint rules that enforce architecture
(§3.5), a migration helper with CI drift check, and a dev outbox for mock email.

## 3. What was built

### 3.1 Monorepo

```
apps/api               NestJS API (HTTP + worker entrypoints)      ← built in Phase 1
packages/config        ESLint / tsconfig / Prettier presets        ← built in Phase 1
packages/shared-types  roles, error codes, money, i18n, auth Zod   ← built in Phase 1
apps/mobile, apps/vendor-portal, apps/admin-portal,
packages/api-client, packages/ui                                   ← placeholders (Phases 3–5)
infra/docker           docker-compose + Postgres init
infra/ci               CI helper scripts
.github/workflows      ci.yml
```

Turborepo runs `build`, `lint`, `typecheck`, `test` and `test:e2e` across
packages, building `shared-types` first.

### 3.2 API skeleton

| Concern | Implementation |
|---|---|
| Configuration | Every env var validated by Zod at boot; the app refuses to start with a clear list of problems. In production it also refuses mock providers (unless listed in `ALLOW_MOCK_PROVIDERS`) and the local default JWT secret. |
| HTTP hardening | Helmet headers, `x-powered-by` removed, CORS allowlist from `CORS_ORIGINS`, `trust proxy` configurable. |
| Routing | All routes under `/v1`; `/healthz` and `/readyz` unprefixed. |
| Validation | Global pipe: whitelist + reject unknown fields + transform. Failures return field-level details. |
| Errors | One envelope everywhere: `{ "error": { "code", "message", "details?", "requestId" } }`. Prisma unique/not-found errors map to 409/404; unknown errors become `INTERNAL` without leaking internals. |
| Logging | pino JSON (pretty in development). Request id reused from a well-formed `x-request-id` or generated, echoed in the response. Tokens, passwords, codes, emails and phone numbers are redacted. |
| Rate limiting | Redis-backed. Default bucket for all routes, plus a stricter auth bucket (`THROTTLE_AUTH_PER_MIN`, default 10/min) on auth endpoints. Returns `RATE_LIMITED`. |
| Health | `/healthz` = liveness; `/readyz` checks Postgres and Redis and returns 503 with per-dependency status when either is down. |
| Docs | Swagger UI at `/docs`, JSON at `/docs-json`; disabled in production unless `SWAGGER_ENABLED=true`. |
| Worker | `dist/worker.js` — same image, health endpoints only for now; BullMQ processors arrive in Phase 2 (ADR-0005). |
| Dev tools | `GET /v1/dev/outbox` shows mock-sent email; not registered in production. |

### 3.3 Provider layer

Every external service sits behind an interface with a real and a mock adapter
(ADR-0003). Phase 1 implements the two that auth needs:

| Provider | Selector | Real adapter | Mock behaviour |
|---|---|---|---|
| `FirebaseAuthProvider` | `FIREBASE_AUTH_PROVIDER=mock\|firebase` | firebase-admin, checks token revocation | Accepts `mock:<uid>[:<+E164>][:<email>]` and `mock:guest:<uid>` |
| `EmailProvider` | `EMAIL_PROVIDER=mock\|smtp` | nodemailer SMTP (Mailpit locally) | Keeps the last 200 messages in memory |

Real adapters run through `callWithPolicy()`: per-call timeout, exponential
backoff with jitter, retries only on network errors, 429 and 5xx.

### 3.4 Authentication

| Flow | Behaviour |
|---|---|
| **Mobile sign-in** | App sends a Firebase ID token once. The API verifies it, creates or finds the user, registers the device (FCM token moves to whoever signed in last on a shared phone) and returns an access + refresh token pair. |
| **Account linking** | An existing account with the same *verified* phone or email is linked instead of duplicated. |
| **Guests** | Anonymous sign-in creates a guest; signing in later with the same Firebase uid and a phone upgrades the same account in place. `@NoGuests()` routes reject guests. |
| **Portal sign-in** | Email + argon2id password. Unknown emails take the same time and return the same error as wrong passwords. |
| **OTP (optional)** | Users with `mfa_enabled` get a 6-digit emailed code: single use, 5-minute expiry, locked after 5 wrong attempts. |
| **Access tokens** | JWT, 15 minutes, carries `roles`, `vendorIds`, session id and guest flag. |
| **Refresh tokens** | 256-bit opaque, 30 days, stored only as SHA-256, **rotated on every use**. Presenting an already-used token revokes the whole session (theft detection). Concurrent refreshes: exactly one wins. Suspended users cannot refresh. |
| **Logout** | Revokes the current session, or every session with `allSessions: true`. |
| **Password reset** | Always answers 202 (no email enumeration); 30-minute single-use link to the vendor or admin portal; resetting signs out every session. |
| **Authorization** | Global guards in order: throttle → authenticate → authorize. Every route requires a token unless `@Public()`. `@Roles()` with hierarchy: `super_admin` ⊇ `admin`, `vendor_owner` ⊇ `vendor_staff`. |

### 3.5 Architecture enforcement

| Rule | Enforced by |
|---|---|
| Modules import each other only through `index.ts` | ESLint rule `tn/module-boundaries` |
| `core/` never imports `modules/` | same rule |
| Vendor SDKs (firebase-admin, nodemailer, razorpay, openai, …) only inside `core/providers` | ESLint `no-restricted-imports` |
| No `any`, strict type-aware rules | `typescript-eslint` `strictTypeChecked` |
| Schema changes always ship with a migration | `db:check` in CI |

### 3.6 Database

- **61 tables, 36 enums** covering identity, catalog, vendors, inventory, orders,
  payments, reviews & reels, AI and ops — UUID keys, UTC `timestamptz`,
  integer paise.
- Extensions: `pgcrypto`, `pg_trgm`, `unaccent`, `citext`, `vector`.
- **Integrity in the database itself** (added in raw SQL, ADR-0008):
  - CHECK constraints: room inventory can never go below zero or above total;
    experience bookings never exceed capacity; all money non-negative; payments
    and refunds positive; commission 0–100%; ratings 1–5.
  - A deferred trigger rejects any ledger transaction that does not balance.
  - Ledger, audit log and order status history are append-only (UPDATE/DELETE blocked).
  - HNSW vector index for AI retrieval, trigram indexes for fuzzy temple
    search, partial index for expiring booking holds.
- The five RBAC roles are inserted by the migration, so they always exist.

### 3.7 Seed data

Idempotent (deterministic IDs) and refuses to run against production.

| Data | Contents |
|---|---|
| Cities | Mathura, Vrindavan, Goverdhan, Barsana, Gokul, Nandgaon (EN + HI) |
| Temples | 5 per city, bilingual names, coordinates, tags, crowd level |
| Aarti schedules | Per temple; standard and Pushtimarg patterns; Banke Bihari has separate summer/winter timings |
| POIs | Hospitals, police stations, parking, pharmacy, ghats; emergency flags |
| Parikrama | Goverdhan Parikrama (21 km) with 4 stops |
| Hotel vendor | *Shri Radha Residency* — 2 hotels, 3 room types each, 60 nights of inventory (weekend +20%) |
| Cab + food vendor | *Braj Yatra Cabs & Kitchen* — 3 vehicles, 3 fare classes with fixed Mathura→Vrindavan fares, a satvik restaurant with 8 dishes, a Yamuna boat ride with 28 slots |
| Platform | Commission rules (10% default, 15% food, 8% cab), notification templates, feature flags, national helplines (112, 108, 1091, 1363) |

## 4. Testing

| Suite | Count | Covers |
|---|---|---|
| Config | 13 | defaults, parsing, all errors reported, production guards, Firebase key handling |
| Roles guard | 11 | public routes, role hierarchy, guest blocking |
| Error filter | 5 | envelope mapping incl. throttling and Prisma errors, no internal leakage |
| Call policy | 10 | retries, no retry on 4xx, retry budget, timeouts |
| Mock Firebase | 11 | every token format, malformed tokens |
| Migration helper | 2 | strips only `rx_` drops |
| shared-types money | 4 | paise conversion, parsing, en-IN formatting, banker's rounding |
| **E2E — health & HTTP** | 8 | health/ready, OpenAPI, request ids, error envelope, 404s, security headers, CORS |
| **E2E — auth** | 25 | sign-in, linking, guest upgrade, device/FCM moves, validation, rotation, reuse revocation, concurrent refresh, expiry, suspension, logout, portal login, RBAC, OTP single-use and lockout, password reset, tampered tokens, rate limiting |

E2E tests run against a real Postgres and Redis (DB 15), migrated once and
reset between tests.

## 5. Running it locally

```bash
cp .env.example .env
pnpm install
pnpm setup      # docker compose up + migrations + seed
pnpm dev        # API on http://localhost:4000 — Swagger at /docs
```

| Who | Credentials (local only) |
|---|---|
| Admin (super_admin) | `admin@tirthnow.local` / `TirthNow@Admin123` |
| Hotel vendor | `hotel.owner@tirthnow.local` / `TirthNow@Vendor123` |
| Cab + food vendor | `cabs.owner@tirthnow.local` / `TirthNow@Vendor123` |
| Mobile demo user | Firebase token `mock:demo-user:+919999900001` |

Local services: MinIO console http://localhost:9001, Mailpit http://localhost:8025.

## 6. Decisions recorded

| ADR | Decision |
|---|---|
| [0007](../adr/0007-dependency-baseline.md) | Pin the newest releases of mature majors (NestJS 11, Prisma 6, TypeScript 5.9, ESLint 9, Jest 29, Zod 3) instead of brand-new majors; upgrade one at a time later |
| [0008](../adr/0008-raw-sql-database-objects.md) | Database objects Prisma cannot model live in migrations as raw SQL (`rx_` prefix); new migrations go through `pnpm db:migrate:new`; CI checks drift |

Earlier ADRs 0001–0006 (modular monolith, Firebase + own JWT, provider
interfaces, order state machine, worker process, i18n/geo) remain in force.

## 7. Known limitations and deferred items

| Item | Status / plan |
|---|---|
| OTP by SMS | Email only in Phase 1; SMS arrives with the notifications module (Phase 2) |
| Other providers (payments, SMS, maps, AI, storage, …) | Implemented with their modules in Phase 2 |
| Idempotency-Key interceptor | Phase 2 (first needed by orders, payments and SOS) |
| Circuit breaker in the call policy | Phase 2, with the first high-volume adapters |
| Soft-delete query filtering | Phase 2, with the first module that soft-deletes |
| Production Dockerfiles, deploy workflow | Phase 6 |
| Sentry wiring | Phase 6 (hook point exists in the exception filter) |
| Access-token revocation | By design, a revoked session's access token stays valid for up to 15 minutes (ADR-0002) |
| Concurrent refresh | Clients must serialise refresh calls; the second of two simultaneous refreshes is treated as reuse |
| Docker in the build sandbox | Compose file validated with `docker compose config`; the same Postgres 16 + pgvector and Redis were run natively for all tests |
| CI on GitHub | The workflow runs on pull requests and pushes to `main`; it has not run yet because no PR exists |

## 8. Actions needed from the product owner

From [`CLIENT_SETUP_TODO.md`](../CLIENT_SETUP_TODO.md), the items that matter now:

1. **Verify seeded aarti times and temple data** (`apps/api/prisma/seed/catalog-data.ts`). They are realistic samples, not confirmed timings, and the AI guide will quote them.
2. **Decide the Node.js version.** The spec fixes Node 20, which reached end-of-life in April 2026. Recommendation: Node 22 LTS.
3. **Start long-lead accounts now:** Razorpay with Route, MSG91 + TRAI DLT templates, WhatsApp Business verification, Apple Developer enrolment.

## 9. Next: Phase 2

Backend modules, each with controller, service, DTOs and tests: identity
(profile, devices, emergency contacts), catalog with search, files, vendors and
KYC, inventory with date-level locking, orders state machine, payments (Razorpay
mock, webhooks, refunds, commission, ledger, payouts), realtime, AI, reels,
safety/SOS, notifications, weather, transit and admin.
