# Tirth Now

Spiritual travel and discovery super-app for the Braj region — Mathura,
Vrindavan, Goverdhan, Barsana, Gokul and Nandgaon.

| App | Path | Stack |
|---|---|---|
| Mobile (Android + iOS) | `apps/mobile` | Flutter 3 |
| API | `apps/api` | NestJS, PostgreSQL 16 + pgvector, Redis + BullMQ |
| Vendor portal | `apps/vendor-portal` | Next.js 14 |
| Admin portal | `apps/admin-portal` | Next.js 14 |

> **Status: Phase 0 (architecture).** Code lands from Phase 1. The setup steps
> below describe the target workflow.

## Local setup (target, from Phase 1)

Prerequisites: Node 20, pnpm 9+, Docker, Flutter 3 (for mobile).

```bash
cp .env.example .env
pnpm install
pnpm setup        # docker compose up + prisma migrate + seed
pnpm dev          # API :4000 (Swagger /docs), vendor portal :3001, admin portal :3002
```

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
