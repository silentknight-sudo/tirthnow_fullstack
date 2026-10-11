# ADR-0015: AI guide, trip planner and AI providers

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The Braj guide answers questions in English, Hindi and Hinglish, plans multi-day trips,
transcribes voice and recognises temples in photos. Wrong aarti times are the most
damaging failure: they change by season and festival and travellers act on them.

## Decision

- **LLM:** Claude through the official `@anthropic-ai/sdk` (only in
  `core/providers/llm`). `LLM_MODEL_DEFAULT=claude-opus-5-5` for chat and planning;
  `LLM_MODEL_CHEAP=claude-haiku-5-5` for the on-topic classifier, moderation and chat
  summaries. Effort `medium` (default tier) / `low` (cheap tier); adaptive thinking is the
  models' default and is not configured. On models that support it the server-side
  refusal fallback (`fallbacks: "default"`) is enabled. Assistant content from tool loops
  is replayed verbatim (thinking blocks included); history from the database is text.
- **Aarti times never come from the model.** Chat exposes `get_aarti_schedule` (database)
  and the prompt forbids stating times not returned by it. The planner builds candidates
  from the database (temples, aarti instances, meals, rest in heat) and the model only
  selects, orders and annotates them by `ref`; output is validated with
  `itineraryPlanSchema` (shared-types) plus ref checks, retried once with the errors,
  then falls back to the deterministic plan (`generatedBy: "fallback"`).
- **RAG:** only admin-approved documents are indexed (text, markdown, PDF via `unpdf`,
  and temple pages synced from the catalog). Heading-aware ~500-token chunks with ~80
  tokens overlap, embedded with OpenAI `text-embedding-3-small` (1536-d; Claude has no
  embedding endpoint), stored in pgvector with an HNSW cosine index. Retrieval filters
  by the chat's city; answers cite sources as `[n]`.
- **Cost controls:** per-user daily request quotas (guest/user) in Redis, tokens recorded
  in `ai_usage`; first-question answers cached 24 h unless a tool was used; rolling
  conversation summary after 16 messages.
- **Speech and vision:** Google Cloud Speech-to-Text, Text-to-Speech and Vision over REST
  with a restricted API key (`GOOGLE_CLOUD_API_KEY`) instead of a service-account JSON;
  TTS output is cached by text hash.
- **Moderation:** `MODERATION_PROVIDER=llm` uses the cheap model with a JSON schema and
  fails open (user reports remain the backstop).
- Every provider has a deterministic mock: the mock LLM recognises each task by a
  `[task:…]` tag in the system prompt and answers only from data in the prompt.

## Alternatives considered

- Letting the model write whole itineraries: fluent but would invent times and places.
- A translation provider: not needed — Claude answers in the traveller's language.
- OpenAI as the chat LLM: possible behind the same interface; not built until needed.

## Consequences

- Chat and planner prompts stay provider-neutral (`LlmProvider`); swapping models is an
  env change. Model ids must exist; check the Models API when upgrading.
- Re-embedding is required if the embedding model changes (reindex each document).
- SSE responses must not be buffered by proxies (`x-accel-buffering: no` is set).
