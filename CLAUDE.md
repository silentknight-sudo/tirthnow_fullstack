# CLAUDE.md — conventions for working on Tirth Now

Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md` and `docs/adr/` before making
structural changes. Keep this file updated as phases land.

## Project status

| Phase | Scope | Status |
|---|---|---|
| 0 | Architecture docs, ERD, ADRs, repo tree | Done |
| 1 | Foundation: monorepo wiring, docker-compose, NestJS skeleton, Prisma schema + seed, auth, CI | Done |
| 2 | Backend modules | Not started |
| 3 | Mobile app (Flutter) | Not started |
| 4 | Vendor portal | Not started |
| 5 | Admin portal | Not started |
| 6 | Hardening & release | Not started |

## Repo map

```
apps/api              NestJS modular monolith (HTTP + worker entrypoints)
apps/mobile           Flutter app
apps/vendor-portal    Next.js 14
apps/admin-portal     Next.js 14
packages/shared-types TS types + Zod schemas (shared with API and portals)
packages/api-client   OpenAPI-generated client for portals
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

pnpm db:migrate:new <name>   # create + apply a migration (strips rx_ drops, ADR-0008)
pnpm --filter @tirth-now/api db:check   # CI: migrations in sync with schema.prisma
pnpm --filter @tirth-now/api db:deploy  # apply migrations
pnpm db:seed                 # idempotent local seed
pnpm --filter @tirth-now/api start:worker   # worker process (after build)
cd apps/mobile && flutter run               # Phase 3
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

## Naming

- DB: snake_case plural tables, snake_case columns; Prisma models PascalCase singular with `@@map`.
- API paths: kebab-case plural nouns, `/v1` prefix. JSON fields camelCase.
- Error codes: `UPPER_SNAKE`, namespaced (`ORDER_INVALID_TRANSITION`, `AUTH_REFRESH_REUSED`), defined in `@tirth-now/shared-types`.
- Queue names: `<module>` with job names `<verb>-<noun>`.
- Events: `<entity>.<past-tense>` e.g. `order.confirmed`, `payment.captured`.
- Flutter: `lib/features/<feature>/{data,domain,presentation}`; generated `*.g.dart` / `*.freezed.dart` are not committed (build_runner in CI).

## Testing

- API: Jest unit tests in `__tests__/*.spec.ts` next to code; e2e (`test/*.e2e-spec.ts`) with Supertest against `DATABASE_URL_TEST`, migrated once in global setup and truncated (except `roles`) via `resetState()`. Redis uses DB 15. All providers mocked; read sent emails from `MockEmailAdapter.outbox`.
- Portals: Playwright against API with mocks.
- Mobile: flutter_test + integration_test.

## Git

- Conventional commits (`feat(orders): …`, `fix(payments): …`, `docs: …`, `chore: …`).
- **No AI attribution anywhere**: no `Co-Authored-By` trailers, no "Generated with" lines, no claude.ai/claude.com links in commits, PRs, code or docs.
- `.claude/` is gitignored; locally `.claude/settings.json` sets `"includeCoAuthoredBy": false`.
- Run lint, typecheck and tests before every commit (Husky + lint-staged from Phase 1).
