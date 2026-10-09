# ADR-0007: Dependency baseline for the API and tooling

- **Status:** Accepted
- **Date:** 2026-10-09

## Context

At the start of Phase 1 the latest majors on npm were NestJS 12, Prisma 7/8-rc,
TypeScript 7, ESLint 10, Jest 30 and Zod 4. Several of these are recent major
rewrites (TypeScript 7 is the native compiler, Prisma 7 changes client
generation and config). Mixing many fresh majors at once raises the risk of
tooling incompatibilities (ts-jest, typescript-eslint, Nest CLI) in the
foundation every later phase builds on.

## Decision

Pin the foundation to the newest releases of the previous, mature majors and
upgrade deliberately later, one major at a time, with the test suite as the
safety net:

| Package | Range |
|---|---|
| Node.js | `>=20.11` (CI uses `.nvmrc` → 20.x, as specified) |
| TypeScript | `~5.9` |
| NestJS | `^11` (`@nestjs/*`), Express 5 |
| Prisma | `^6.19` with `prisma.config.ts` |
| Zod | `^3.25` |
| ESLint / typescript-eslint | `^9` / `^8` (flat config, `strictTypeChecked`) |
| Jest / ts-jest | `^29` |
| pnpm / Turborepo | `10.28` / `^2` |

## Consequences

- Upgrades are tracked as their own `chore(deps)` PRs.
- **Node 20 reached end-of-life in April 2026.** The spec fixes Node 20, so CI
  runs 20.x; everything also runs on Node 22 LTS (used locally). Recommend
  switching `.nvmrc` and production images to 22 — listed in
  `docs/CLIENT_SETUP_TODO.md` as a decision for the product owner.
