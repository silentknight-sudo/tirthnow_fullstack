# ADR-0003: Provider-interface pattern for every external service

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The product depends on ~17 external services (Razorpay, MSG91, WhatsApp, FCM,
Google Maps/STT/TTS/Vision/Translate, Claude/OpenAI, embeddings, R2, Stream/Mux,
OpenWeather, transit). Several require business verification that takes weeks
(Razorpay Route, DLT, WhatsApp Business). Developers and CI must run the full
system with zero accounts. Some providers may be swapped (Google Maps ↔ Mapbox,
Stream ↔ Mux, Claude ↔ OpenAI).

## Decision

For each capability define a TypeScript interface and DI token in
`apps/api/src/core/providers/<capability>/`, with:

- one or more **real adapters**,
- a **mock adapter** with deterministic, documented behaviour (see
  `docs/INTEGRATIONS.md`), including failure triggers for testing,
- selection by env var `<CAPABILITY>_PROVIDER`, validated by the Zod config
  schema.

Adapters are wrapped with a shared call policy (timeout, retry with backoff +
jitter for safe calls, circuit breaker, logging). Domain code depends only on
the interface. Interfaces speak our domain types (paise integers, E.164 phones,
UTC dates), never the vendor SDK's types.

Production boot fails if a mock is selected, unless the capability is listed in
`ALLOW_MOCK_PROVIDERS`.

## Alternatives considered

- **Calling SDKs directly + nock/msw in tests.** Rejected: local dev would still
  need accounts; swapping vendors touches domain code.
- **A separate integration gateway service.** Rejected: unnecessary hop for a
  modular monolith (ADR-0001).

## Consequences

- Every new integration costs an interface + mock; worth it for testability.
- Contract tests run each real adapter against the provider sandbox in a
  nightly, opt-in CI job (keys from CI secrets), not on every PR.
- Embedding dimension is part of the `EmbeddingProvider` contract (1536); a
  provider with another dimension must be configured to 1536 or the change
  requires a migration + full re-index.
