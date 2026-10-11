# Client setup TODO — accounts and keys needed for production

Everything runs locally on mocks. These are required before staging/production.
Lead times matter: start the slow ones (★) early.

| # | Item | Needed for | Env / artefact | Notes |
|---|---|---|---|---|
| 1 | Firebase project (Auth: phone, Google, Apple, anonymous; FCM; Crashlytics) | Mobile login, push | `FIREBASE_*`, `google-services.json`, `GoogleService-Info.plist` | Enable App Check for phone auth abuse protection. |
| 2 | Apple Developer account + Sign in with Apple key | iOS release, Apple login | Codemagic signing | ★ Org enrolment needs D-U-N-S number. |
| 3 | Google Play Console | Android release | Upload keystore | |
| 4 | ★ Razorpay account + KYC, **Route** enabled, webhook secret | Payments, vendor payouts | `RAZORPAY_*` | Route activation needs a separate request to Razorpay. |
| 5 | ★ MSG91 account + **TRAI DLT** entity & template registration | SMS (SOS, OTP fallback, booking) | `MSG91_*`, template ids in `notification_templates` | DLT approval can take 1–3 weeks. |
| 6 | ★ WhatsApp Business (Meta) verification + message templates | SOS + booking messages | `WHATSAPP_*` | Stays mocked until approved. |
| 7 | Google Cloud project: Maps (Routes API, Maps SDK Android/iOS), Speech-to-Text, Text-to-Speech, Vision | Maps, voice, landmark recognition | `GOOGLE_MAPS_API_KEY`, `GOOGLE_CLOUD_API_KEY` | Separate restricted keys: server Maps key, server key limited to Speech/TTS/Vision, and app keys per platform. |
| 8 | Anthropic (Claude) API key | AI guide, planner, moderation | `ANTHROPIC_API_KEY`, `LLM_MODEL_*` | Defaults `claude-opus-5-5` / `claude-haiku-5-5` (ADR-0015). |
| 9 | OpenAI API key (embeddings only) | RAG knowledge base | `OPENAI_API_KEY` | `text-embedding-3-small`, 1536 dimensions. |
| 10 | Cloudflare account: R2 buckets (public + private), Stream (or Mux) | Media, reels | `S3_*`, `CF_STREAM_*` / `MUX_*` | |
| 11 | OpenWeather API key | Weather | `OPENWEATHER_API_KEY` | |
| 12 | Transit partner (train search API) | Transit | TBD | Mock + IRCTC deep links until chosen. |
| 13 | Sentry org + projects (api, vendor-portal, admin-portal, mobile) | Error tracking | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | |
| 14 | Codemagic account linked to repo | Store builds | `codemagic.yaml` | |
| 15 | Production hosting target (API, worker, Postgres 16 with pgvector, Redis) | Deploy | Deploy workflow secrets | Choose in Phase 6. |
| 16 | Transactional email provider (SES / Postmark) + domain DNS (SPF, DKIM) | Portal emails | `SMTP_*` | |
| 17 | Legal: privacy policy, terms, refund/cancellation policy, Data Protection (DPDP Act 2023) notices | Store listings, payments | URLs in `app_config` | |
| 18 | **Verify seeded content**: temple list, coordinates and every aarti time (`apps/api/prisma/seed/catalog-data.ts`) with each temple or a local content team | Catalog, AI guide (quotes aarti times from the DB) | — | Seed times are realistic samples, not verified timings. |
| 19 | **Decide Node.js runtime**: spec says Node 20, which reached end-of-life in April 2026. Recommend Node 22 LTS for CI and production images | Security patches | `.nvmrc`, Dockerfiles | See ADR-0007. |

## Message templates to register (rows 5 and 6)

Until these are approved the API uses the mock SMS / WhatsApp adapters. After approval,
add a row per key and channel in `notification_templates` (admin portal → templates)
with the gateway id; text in the row overrides the built-in wording.

| Key | Channel | Variables (in order) | Purpose |
|---|---|---|---|
| `sos_alert` | SMS (DLT) | `name`, `link`, `police` | Alert emergency contacts with the live-location link |
| `sos_alert` | WhatsApp (utility) | `name`, `link`, `police` | Same, on WhatsApp |
| `sos_resolved` | SMS (DLT) | `name` | Tell contacts the traveller is safe |

Push notifications need no registration beyond the Firebase project (row 1); the
mobile app must create the Android channels `orders`, `aarti`, `sos` and `general`.

## Content the client team prepares (Phase 2)

- **Knowledge base**: approve the catalog sync (`POST /v1/admin/knowledge-documents/sync-catalog`)
  and upload vetted guides (parikrama, etiquette, festival stories) as text or PDF. Only
  approved documents are quoted by the AI guide.
- **Commission rules**: at least one global rule (`/v1/admin/commission-rules`) before
  the first booking; vendor-specific rules for launch partners.
- **Helplines**: `safety.helplines` setting in `/v1/admin/config` (defaults to 112).
