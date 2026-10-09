# Tirth Now

Spiritual travel and discovery super-app for the Braj region — Mathura,
Vrindavan, Goverdhan, Barsana, Gokul and Nandgaon.

| App | Path | Stack |
|---|---|---|
| Mobile (Android + iOS) | `apps/mobile` | Flutter 3 |
| API | `apps/api` | NestJS, PostgreSQL 16 + pgvector, Redis + BullMQ |
| Vendor portal | `apps/vendor-portal` | Next.js 14 |
| Admin portal | `apps/admin-portal` | Next.js 14 |

> **Status: Phase 1 (foundation) complete** — monorepo, local infra, API
> skeleton, full database schema + seed, authentication and CI. Feature modules
> arrive in Phase 2.

## Local setup

Prerequisites: Node 20+ (22 LTS recommended), pnpm 10 (`corepack enable`), Docker, Flutter 3 (Phase 3).

```bash
cp .env.example .env
pnpm install
pnpm setup        # docker compose up + migrations + seed
pnpm dev          # API on :4000 — Swagger at http://localhost:4000/docs
```

Seeded logins (local only):

| Who | How |
|---|---|
| Admin | `admin@tirthnow.local` / `TirthNow@Admin123` → `POST /v1/auth/portal/login` |
| Hotel vendor | `hotel.owner@tirthnow.local` / `TirthNow@Vendor123` |
| Cab + food vendor | `cabs.owner@tirthnow.local` / `TirthNow@Vendor123` |
| Mobile demo user | `POST /v1/auth/firebase` with `{"idToken":"mock:demo-user:+919999900001"}` |
| Any new mobile user | `mock:<uid>:<+91…>` (phone), `mock:<uid>:<email>`, or `mock:guest:<uid>` |

Common commands: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`,
`pnpm build`, `pnpm db:migrate:new <name>`. See [CLAUDE.md](CLAUDE.md) for the
full list and conventions.

Everything runs locally with **mock providers** — no Razorpay, Firebase, Google,
MSG91 or LLM accounts needed. Local services:

| Service | URL |
|---|---|
| API / Swagger | http://localhost:4000/docs |
| Vendor portal | http://localhost:3001 |
| Admin portal | http://localhost:3002 |
| MinIO console | http://localhost:9001 (minioadmin / minioadmin) |
| Mailpit | http://localhost:8025 |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system context, module boundaries, flows
- [Data model](docs/DATA_MODEL.md) — ERD and table notes
- [API](docs/API.md) — modules and endpoints
- [Integrations](docs/INTEGRATIONS.md) — providers, env vars, mock behaviour
- [ADRs](docs/adr/)
- [Client setup TODO](docs/CLIENT_SETUP_TODO.md) — accounts and keys needed for production
- [Phase 1 completion report](docs/phases/PHASE_1_COMPLETION.md)
