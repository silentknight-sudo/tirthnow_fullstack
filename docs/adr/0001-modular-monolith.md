# ADR-0001: Modular monolith instead of microservices

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Tirth Now has ~15 business domains (identity, catalog, vendors, inventory,
orders, payments, reels, AI, safety, notifications, …) serving three clients.
The team is small, traffic is seasonal and spiky (Janmashtami, Holi, Radhashtami
bring 10–50× normal load in Braj), and many flows are transactional across
domains — e.g. creating an order must lock room inventory and create a payment
intent atomically.

## Decision

Build a **single NestJS application** (`apps/api`) organized as a modular
monolith, deployed as two process types from one image:

- `api` — HTTP + Socket.IO
- `worker` — BullMQ processors and schedulers

Module boundaries are enforced in code:

1. Each module exposes a facade + types through `index.ts`; deep imports into
   another module are an ESLint error.
2. Each module owns its tables; no cross-module Prisma queries.
3. Cross-module side effects go through in-process domain events, which hand off
   to BullMQ when durability is needed.

## Alternatives considered

- **Microservices** (per domain, message bus). Rejected: distributed
  transactions for booking/payment, N deploy pipelines, service discovery and
  tracing overhead — costs we cannot justify for a small team at launch.
- **Unstructured monolith.** Rejected: rapid coupling; we want the option to
  extract a service later.

## Consequences

- One database transaction can span inventory + order + payment intent: simpler
  correctness for booking.
- Scaling is horizontal for the whole API; heavy async work (transcoding,
  embeddings, notifications) is isolated in the worker process and can be
  scaled independently.
- Extraction path: a module whose facade is only consumed via events/queues
  (likely candidates: `ai`, `reels` media pipeline, `notifications`) can become
  a separate service without touching callers.
- We must keep the lint rule and table-ownership rule honest in code review.
