# ADR-0008: Raw-SQL database objects alongside Prisma migrations

- **Status:** Accepted
- **Date:** 2026-10-09

## Context

Prisma's schema language cannot express several things the data model needs:
pgvector HNSW indexes, expression and partial indexes (trigram search, pending
holds), CHECK constraints (non-negative money, inventory never below zero),
and triggers (balanced ledger transactions, append-only tables). When a
migration is generated, Prisma's differ wants to `DROP` indexes it does not
know about.

## Decision

- These objects are written by hand at the end of the migration that needs
  them. Indexes created this way are named with the `rx_` prefix.
- New migrations are created with `pnpm db:migrate:new <name>`
  (`apps/api/scripts/new-migration.ts`), which runs
  `prisma migrate dev --create-only`, strips any generated `DROP INDEX "rx_…"`
  statements, and applies the result.
- CI runs `pnpm --filter @tirth-now/api db:check`, which diffs migrations
  against `schema.prisma` (ignoring `rx_` drops) and fails if a schema change
  has no migration.
- CHECK constraints and triggers are not diffed by Prisma and need no special
  handling; they are still documented in `docs/DATA_MODEL.md`.
- Reference rows that must always exist (the five RBAC roles) are inserted by
  the migration, not the seed.

## Alternatives considered

- Applying raw objects from a separate post-migrate script: `prisma migrate dev`
  would then report drift and offer to reset the database.
- Dropping Prisma for a SQL-first tool: loses the typed client the whole API
  uses.

## Consequences

- Plain `prisma migrate dev` should not be used to create migrations; it will
  prompt to drop `rx_` indexes. The helper script is the supported path.
- Database objects outside Prisma's model are invisible in `schema.prisma`;
  comments on the affected models point to them.
