# CLAUDE.md — conventions for working on Tirth Now

Read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md` and `docs/adr/` before making
structural changes. Keep this file updated as phases land.

## Project status

| Phase | Scope | Status |
|---|---|---|
| 0 | Architecture docs, ERD, ADRs, repo tree | Done — awaiting approval |
| 1 | Foundation: monorepo wiring, docker-compose, NestJS skeleton, Prisma schema + seed, auth, CI | Not started |
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

## Commands (available from Phase 1)

```
pnpm install
pnpm dev:infra          # docker compose up -d (Postgres, Redis, MinIO, Mailpit)
pnpm db:migrate         # prisma migrate dev
pnpm db:seed
pnpm dev                # turbo: api + portals
pnpm lint | pnpm typecheck | pnpm test | pnpm build
cd apps/mobile && flutter run
```

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

## Naming

- DB: snake_case plural tables, snake_case columns; Prisma models PascalCase singular with `@@map`.
- API paths: kebab-case plural nouns, `/v1` prefix. JSON fields camelCase.
- Error codes: `UPPER_SNAKE`, namespaced (`ORDER_INVALID_TRANSITION`, `AUTH_REFRESH_REUSED`), defined in `@tirth-now/shared-types`.
- Queue names: `<module>` with job names `<verb>-<noun>`.
- Events: `<entity>.<past-tense>` e.g. `order.confirmed`, `payment.captured`.
- Flutter: `lib/features/<feature>/{data,domain,presentation}`; generated `*.g.dart` / `*.freezed.dart` are not committed (build_runner in CI).

## Testing

- API: Jest unit tests next to code (`__tests__`), e2e with Supertest against `DATABASE_URL_TEST` (migrated + truncated per suite). All providers mocked.
- Portals: Playwright against API with mocks.
- Mobile: flutter_test + integration_test.

## Git

- Conventional commits (`feat(orders): …`, `fix(payments): …`, `docs: …`, `chore: …`).
- **No AI attribution anywhere**: no `Co-Authored-By` trailers, no "Generated with" lines, no claude.ai/claude.com links in commits, PRs, code or docs.
- `.claude/` is gitignored; locally `.claude/settings.json` sets `"includeCoAuthoredBy": false`.
- Run lint, typecheck and tests before every commit (Husky + lint-staged from Phase 1).
