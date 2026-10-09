# ADR-0005: Background workers share the API codebase and image

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

BullMQ jobs (SOS fan-out, notifications, transcoding, embeddings, payouts)
need the same Prisma models, providers and domain services as the HTTP API.

## Decision

`apps/api` has two entrypoints: `main.ts` (HTTP + Socket.IO) and `worker.ts`
(BullMQ processors + repeatable job schedulers, `/healthz` only). Same Docker
image, different command. Processors live inside their owning module
(`modules/<m>/processors`). A `PROCESS_ROLE=api|worker|all` env var decides
which providers register; `all` is the local default for one-process dev.

## Alternatives considered

- Separate `apps/worker` package: duplicates module wiring for no gain at our size.
- Running processors in the API process in prod: transcoding/embedding load
  would hurt request latency and SOS fan-out must not compete with HTTP.

## Consequences

- Scale API and worker independently by replica count.
- The SOS queue gets a dedicated concurrency slot so it is never starved.
