# CLAUDE.md — conventions for working on Tirth Now

Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md` and `docs/adr/` before making
structural changes. Keep this file updated as phases land.

## Project status

| Phase | Scope | Status |
|---|---|---|
| 0 | Architecture docs, ERD, ADRs, repo tree | Done |
| 1 | Foundation: monorepo wiring, docker-compose, NestJS skeleton, Prisma schema + seed, auth, CI | Done |
| 2 | Backend modules (all 16 modules, 227 routes, realtime, workers) | Done |
| 3 | Mobile app (Flutter): auth, home, temples + aarti, bookings + payments, SOS, notifications, reels, AI guide + planner | Done |
| 4 | Vendor portal (Next.js static, typed API client, Playwright) | Done |
| 5 | Admin portal | Not started |
| 6 | Hardening & release | Not started |

## Repo map

```
apps/api              NestJS modular monolith (HTTP + worker entrypoints)
apps/mobile           Flutter app
apps/vendor-portal    Next.js 14 static export (partner portal)
apps/admin-portal     Next.js 14
apps/website          Marketing site (Next.js static export, framer-motion scroll motion)
packages/shared-types TS types + Zod schemas (shared with API and portals)
packages/api-client   openapi-typescript schema + openapi-fetch client for portals
packages/ui           Shared React components + Tailwind preset
packages/config       eslint / tsconfig / prettier presets
infra/docker          docker-compose + Dockerfiles
infra/ci              CI helper scripts (workflows themselves live in .github/workflows)
docs/                 Architecture, data model, API, integrations, ADRs
```

## API module map

identity · catalog · files · vendors · inventory · orders · payments · reviews ·
reels · ai · safety · notifications · weather · transit · realtime · admin —
plus `core/` (config, prisma, logging, http, auth, idempotency, queue, cache,
providers). Ownership table: `docs/ARCHITECTURE.md` §2.

## Commands

```
cp .env.example .env
pnpm install                 # also runs prisma generate
pnpm setup                   # infra up + migrate + seed (first time)
pnpm dev                     # turbo: api (+ portals later)
pnpm lint | pnpm typecheck | pnpm test | pnpm build
pnpm test:e2e                # API e2e against DATABASE_URL_TEST + Redis db 15
pnpm format                  # prettier

pnpm db:migrate:new <name>   # create (via migrate diff, no prompts) + apply + generate; strips rx_ drops (ADR-0008)
pnpm --filter @tirth-now/api db:check   # CI: migrations in sync with schema.prisma
pnpm --filter @tirth-now/api db:deploy  # apply migrations
pnpm db:seed                 # idempotent local seed
pnpm --filter @tirth-now/api start:worker   # worker process (after build)
pnpm --filter @tirth-now/api openapi:export   # API → packages/api-client/openapi.json
cd apps/mobile && node tool/gen_api_models.mjs  # → lib/core/api/api_models.dart (committed)
cd apps/mobile && flutter run                   # mock auth (OTP 123456) + mock payments
cd apps/mobile && flutter analyze && flutter test
cd apps/mobile && flutter test test/contract --dart-define=API_CONTRACT_URL=http://localhost:4000
pnpm --filter @tirth-now/api-client generate      # openapi.json → typed portal client
pnpm --filter @tirth-now/vendor-portal dev        # partner portal on :3001
pnpm --filter @tirth-now/vendor-portal e2e        # Playwright (built portal + seeded API)
```

Do not use plain `prisma migrate dev` to create migrations (it will offer to drop `rx_` indexes).
`prisma migrate reset` is guarded against AI agents; reset a scratch DB with `dropdb`/`createdb` + `db:deploy`.

## Hard rules

- **TypeScript strict, no `any`** (use `unknown` + narrowing). Dart: strict analysis options.
- **Validate every input**: class-validator DTOs in the API (`whitelist`, `forbidNonWhitelisted`), Zod in portals, form validators in Flutter.
- **Money = integer paise** (`*_paise`). Never floats. Format only at the edge.
- **Time = UTC `timestamptz`**; convert to `Asia/Kolkata` only for display. Aarti times are local wall-clock + RRULE, expanded by catalog service.
- **External calls only via `core/providers/*` interfaces**, each with real + mock adapter, selected by `<X>_PROVIDER` env. Never import a vendor SDK in a module.
- **Idempotency-Key** required on payment, booking (order create/cancel), refund, payout approval and SOS endpoints.
- **Module boundaries**: import other modules only through their `index.ts` facade. A module owns its tables.
- **Order status** changes only via `OrdersService.transition()`.
- **No secrets in code or clients.** Add every new env var to `.env.example` and `docs/INTEGRATIONS.md`. Anything needing a real account → `docs/CLIENT_SETUP_TODO.md`.
- **AI never invents aarti times** — they come from the DB via tool calls.
- New decision not covered by docs → simplest robust option + new ADR in `docs/adr/` (copy `0000-template.md`).

## How the API is put together (Phase 1)

- Entry points: `src/main.ts` (HTTP) and `src/worker.ts` (worker). Both call `loadDotEnv()` (root `.env`) then `loadConfig()` (Zod, `src/core/config/env.schema.ts`). New env var → schema + `AppConfig` + `.env.example`.
- `configureApp()` in `src/app.setup.ts` applies helmet, CORS, `/v1` prefix (except `/healthz`, `/readyz`), validation pipe, error filter and Swagger — reuse it in e2e tests via `test/helpers.ts#createTestApp`.
- Global guard order: `ThrottlerGuard` → `JwtAuthGuard` → `RolesGuard`. Every route needs a token unless marked `@Public()`. Use `@Roles(...)`, `@NoGuests()`, `@CurrentUser()` from `src/core/auth`. `super_admin` implies `admin`; `vendor_owner` implies `vendor_staff`.
- Auth routes use `@AuthThrottle()` (stricter `THROTTLE_AUTH_PER_MIN` bucket).
- Throw `AppException` (codes from `@tirth-now/shared-types`) for client-facing errors; anything else becomes a 500 `INTERNAL`.
- Providers: interface + DI token + `mock.adapter.ts` + real adapter + module choosing by config, wrapped in `callWithPolicy()` (timeout/retry). Register in `src/core/providers/providers.module.ts`. Lint blocks vendor SDK imports outside `src/core/providers`.
- Lint rule `tn/module-boundaries` blocks deep imports across `src/modules/*` and any `core → modules` import.
- Seed data uses deterministic UUIDs (`sid('kind:key')`) so re-running updates in place.

## How the Phase 2 modules fit

- Cross-module reactions go through domain events (`order.*`, `payment.*`, `refund.*`, `payout.*`, `vendor.*`, `sos.*`, `reel.published`, `review.flagged`, `media.uploaded|rejected`, `catalog.aarti_changed`). Listeners must never throw into the emitter (wrap and log).
- Payments: double-entry ledger (ADR-0009), commission + GST on commission (ADR-0010), payouts (ADR-0011). Every new money flow posts to the ledger and gets a balanced-ledger assertion in e2e.
- Realtime: never import the realtime module; emit a domain event and map it in `realtime/listeners`. All emits go through `RealtimePublisher` (Redis emitter), so workers can publish (ADR-0013).
- Notifications: add a template in `notifications/templates.ts` (en + hi, declare variables) and call `NotificationsFacade.notifyUsers()`; categories map to user preferences.
- Periodic work: `MaintenanceRegistry.registerRecurring(name, everyMs, fn)` (runs on the maintenance queue in the worker); daily clean-ups use `register()`.
- AI: system prompts start with `[task:<name>]` (the mock LLM dispatches on it). Aarti times only via `get_aarti_schedule` / the planner's DB candidates (ADR-0015). Models: `LLM_MODEL_DEFAULT` / `LLM_MODEL_CHEAP`.
- Mock-only test helpers: `MockPaymentAdapter.holdRefunds`, `MockVideoAdapter.holdAssets`, `MockSmsAdapter.rejectNumbers`, `MockLlmAdapter.calls`; Socket.IO helpers `connectSocket` / `subscribeRoom` / `nextEvent` in `test/helpers.ts`.

## How the mobile app fits (Phase 3)

- Read ADR-0017 first. Riverpod 3 (no codegen), go_router `StatefulShellRoute` (Home, Temples, Book, Guide, Profile); `/sos` works signed out.
- Never hand-write API types: change the API, run `openapi:export`, then `tool/gen_api_models.mjs`. CI fails if either is stale.
- All HTTP goes through `ApiClient` (`core/api/api_client.dart`): `/v1` prefix, `Accept-Language`, bearer token, single shared refresh on 401. Pass `idempotencyKey: ApiClient.newIdempotencyKey()` for orders, payment verify, cancel and SOS — one key per user tap.
- Client-side providers mirror the API pattern: `IdentityProvider` (mock | firebase) and `PaymentCheckout` (mock | razorpay), chosen by `--dart-define`. Mock OTP is `123456`; mock checkout calls the API's dev checkout.
- Every UI string lives in `lib/l10n/app_en.arb` + `app_hi.arb`; run `flutter gen-l10n`. Money via `formatRupees(paise)`, times via `formatIstTime` (IST for display only).
- Aarti times are shown exactly as the API returns them; the app never computes or estimates them.
- Guests can browse, chat with the guide and use SOS; bookings, reviews, reminders and the planner call `requireSignedIn()`.
- Theme tokens in `core/theme/app_theme.dart` (`TnColors`: navy, accent/saffron on warm white, ADR-0018), same palette as the website; fonts bundled in `assets/fonts`.
- Installable APK: `.github/workflows/mobile-apk.yml` (repo variable `MOBILE_API_BASE_URL` sets the API origin).

## Deployment

- API demo on Render via `render.yaml` (Blueprint; all resources in one region). Guide: `docs/DEPLOY_RENDER.md`.
- Client-facing status docs: `docs/PROGRESS_BRIEF.pdf`, `docs/PROJECT_STATUS.pdf`, `docs/CLIENT_REQUIREMENTS.pdf`.

## How the vendor portal fits (Phase 4)

- Read ADR-0019. Static export (`out/`), client components + TanStack Query; detail pages take `?id=`.
- All calls via `api` from `lib/api.ts` (`@tirth-now/api-client`): `api.GET('/v1/...', { params })`, typed from `src/schema.ts`. Never hand-write request/response types; regenerate with `pnpm --filter @tirth-now/api-client generate` after `openapi:export`.
- Forms: React Hook Form + Zod, rules mirror the API DTOs (`lib/validation.ts`). Money typed in rupees → `toPaise()`; display with `rupees()`. Times shown in IST (`lib/format.ts`).
- Gate UI with `useVendor().can('<permission>')`; the API enforces the same.
- `pnpm --filter @tirth-now/vendor-portal e2e` runs Playwright against the built portal on :3001 and a seeded API on :4000.

## Naming

- DB: snake_case plural tables, snake_case columns; Prisma models PascalCase singular with `@@map`.
- API paths: kebab-case plural nouns, `/v1` prefix. JSON fields camelCase.
- Error codes: `UPPER_SNAKE`, namespaced (`ORDER_INVALID_TRANSITION`, `AUTH_REFRESH_REUSED`), defined in `@tirth-now/shared-types`.
- Queue names: `<module>` with job names `<verb>-<noun>`.
- Events: `<entity>.<past-tense>` e.g. `order.confirmed`, `payment.captured`.
- Flutter: `lib/features/<feature>/{data,presentation}`; no build_runner. API models are generated from OpenAPI into `lib/core/api/api_models.dart` and committed (ADR-0017).

## Testing

- API: Jest unit tests in `__tests__/*.spec.ts` next to code; e2e (`test/*.e2e-spec.ts`) with Supertest against `DATABASE_URL_TEST`, migrated once in global setup and truncated (except `roles`) via `resetState()`. Redis uses DB 15. All providers mocked; read sent emails from `MockEmailAdapter.outbox`.
- Portals: Playwright against API with mocks.
- Mobile: unit + widget tests (`flutter test`, providers overridden in `test/helpers.dart`), contract tests against a live API (`test/contract`, run in CI).

## Git

- Conventional commits (`feat(orders): …`, `fix(payments): …`, `docs: …`, `chore: …`).
- **No AI attribution anywhere**: no `Co-Authored-By` trailers, no "Generated with" lines, no claude.ai/claude.com links in commits, PRs, code or docs.
- `.claude/` is gitignored; locally `.claude/settings.json` sets `"includeCoAuthoredBy": false`.
- Run lint, typecheck and tests before every commit (Husky + lint-staged from Phase 1).
