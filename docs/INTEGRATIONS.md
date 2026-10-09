# Tirth Now — Integrations

Every third-party service is reached through an interface in
`apps/api/src/core/providers/<name>/`. Each has:

- `<name>.provider.ts` — the interface + DI token
- `<vendor>.adapter.ts` — real implementation
- `mock.adapter.ts` — deterministic local implementation (no network)
- `<name>.module.ts` — picks the adapter from env at boot

All real adapters share a `HttpCallPolicy`: timeout (default 10 s), retries with
exponential backoff + jitter on network errors/5xx/429 (default 3), circuit
breaker per provider, and structured logging with the request id. Retries are
**never** applied to non-idempotent calls unless the provider supports an
idempotency key (Razorpay does; we always send one).

`NODE_ENV=production` refuses to boot with any `*_PROVIDER=mock` except those
explicitly allowed by `ALLOW_MOCK_PROVIDERS` (e.g. `whatsapp,transit` until
approved).

---

| Interface | Selector env | Real adapter(s) | Env vars (real) | Mock behaviour |
|---|---|---|---|---|
| `FirebaseAuthProvider` | `FIREBASE_AUTH_PROVIDER=mock\|firebase` | firebase-admin `verifyIdToken` | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Accepts tokens shaped `mock:<uid>[:<phone>][:<email>]`; `mock:guest:<uid>` = anonymous. |
| `PushProvider` | `PUSH_PROVIDER=mock\|fcm` | FCM HTTP v1 via firebase-admin | (same Firebase vars) | Logs payload, stores in an in-memory outbox exposed at `GET /dev/outbox` (non-prod only). |
| `SmsProvider` | `SMS_PROVIDER=mock\|msg91` | MSG91 Flow API (DLT templates) | `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_DLT_ENTITY_ID` | Logs + dev outbox; phone `+910000000000` simulates failure. |
| `WhatsAppProvider` | `WHATSAPP_PROVIDER=mock\|meta` | WhatsApp Business Cloud API (template messages) | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_BUSINESS_ACCOUNT_ID` | Dev outbox. Stays the default until Meta approval. |
| `EmailProvider` | `EMAIL_PROVIDER=smtp` | SMTP (Mailpit locally, SES/Postmark later) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Mailpit UI at http://localhost:8025. |
| `PaymentProvider` | `PAYMENT_PROVIDER=mock\|razorpay` | Razorpay Orders, Payments, Refunds, Route (linked accounts, transfers), webhook signature | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_ACCOUNT_ID` | Creates `order_mock_*` ids; signatures are HMAC with `MOCK_PAYMENT_SECRET`; `POST /v1/payments/webhooks/mock` simulates `payment.captured`, `payment.failed`, `refund.processed`, `transfer.processed`. Amount ending in `13` paise fails. |
| `StorageProvider` | `STORAGE_PROVIDER=s3` | S3-compatible (Cloudflare R2 in prod, MinIO locally) | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_PUBLIC`, `S3_BUCKET_PRIVATE`, `MEDIA_PUBLIC_BASE_URL` | MinIO in docker-compose — same adapter, no mock needed. |
| `VideoProvider` | `VIDEO_PROVIDER=mock\|cloudflare_stream\|mux` | Cloudflare Stream / Mux (HLS) | `CF_STREAM_ACCOUNT_ID`, `CF_STREAM_API_TOKEN`, `CF_STREAM_WEBHOOK_SECRET` / `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET` | Marks video ready after 2 s; HLS URL points at a sample `.m3u8` in MinIO (or progressive MP4 fallback). |
| `MapsProvider` | `MAPS_PROVIDER=mock\|google` (Mapbox adapter possible later) | Google Directions, Distance Matrix, Places, Geocoding | `GOOGLE_MAPS_API_KEY` (server); mobile uses separate restricted keys | Haversine distance × 1.3 road factor, 25 km/h average speed; geocode from seeded POIs. |
| `LlmProvider` | `LLM_PROVIDER=mock\|anthropic\|openai` | Claude Messages API (default), OpenAI adapter | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `LLM_MODEL_DEFAULT`, `LLM_MODEL_CHEAP` | Deterministic canned responses: echoes retrieved chunk titles as citations, streams token-by-token; planner returns a valid fixture itinerary built from DB temples. |
| `EmbeddingProvider` | `EMBEDDING_PROVIDER=mock\|openai\|voyage` | OpenAI `text-embedding-3-small` (1536-d) or Voyage (projected/selected to 1536-d) | `OPENAI_API_KEY` / `VOYAGE_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS=1536` | Hash-seeded pseudo-random unit vectors (stable per text) — retrieval works roughly by shared tokens via a bag-of-words projection. |
| `SpeechToTextProvider` | `STT_PROVIDER=mock\|google` | Google Cloud Speech-to-Text v2 (hi-IN, en-IN) | `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `GOOGLE_CLOUD_PROJECT` | Returns `"Banke Bihari mandir kab khulta hai?"` (or text from a sidecar `.txt` in tests). |
| `TextToSpeechProvider` | `TTS_PROVIDER=mock\|google` | Google Cloud TTS | (same) | Returns a short silent MP3 stored in MinIO. |
| `VisionProvider` | `VISION_PROVIDER=mock\|google` | Google Vision (landmark + label detection, SafeSearch) | (same) | Landmark: matches filename hint (`banke-bihari.jpg`) else top seeded temple at 0.42 confidence. SafeSearch: all `VERY_UNLIKELY`. |
| `TranslateProvider` | `TRANSLATE_PROVIDER=mock\|google` | Google Translate v3 | (same) | Returns input prefixed with `[hi] `/`[en] `. |
| `ModerationProvider` | `MODERATION_PROVIDER=mock\|llm` | Composite: LLM (cheap model) for text + VisionProvider SafeSearch for images | (uses LLM/Vision vars) | Flags text containing words from a small blocklist fixture. |
| `WeatherProvider` | `WEATHER_PROVIDER=mock\|openweather` | OpenWeather Current + One Call | `OPENWEATHER_API_KEY` | Seasonal fixture per city (hot in May, foggy in Jan). |
| `TransitProvider` | `TRANSIT_PROVIDER=mock` (real adapter TBD) | Partner API (e.g. RailYatri/ConfirmTkt/IRCTC partner) | TBD | Sample trains Delhi ↔ Mathura Jn with deep links to IRCTC. |
| Error tracking | `SENTRY_DSN` (empty = disabled) | Sentry | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` | Disabled. |

### Client-side keys

Clients only ever hold **publishable/restricted** keys:

| Client | Keys |
|---|---|
| Mobile | Firebase config (`google-services.json`, `GoogleService-Info.plist`), Google Maps SDK key (restricted to app signature/bundle id), Razorpay `key_id` (returned by API per order), Sentry DSN |
| Portals | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (HTTP-referrer restricted) |

Secrets (Razorpay secret, LLM keys, MSG91, Google service account) live only in
the API's environment.

### Webhooks

| Source | Endpoint | Verification |
|---|---|---|
| Razorpay | `POST /v1/payments/webhooks/razorpay` | HMAC-SHA256 of raw body with `RAZORPAY_WEBHOOK_SECRET`, header `X-Razorpay-Signature` |
| Cloudflare Stream / Mux | `POST /v1/reels/webhooks/video` | Provider-specific signature header |
| MSG91 delivery reports | `POST /v1/notifications/webhooks/msg91` | Shared secret query param + IP allowlist |
| WhatsApp | `GET/POST /v1/notifications/webhooks/whatsapp` | `hub.verify_token` + `X-Hub-Signature-256` |

Raw bodies are preserved for these routes (Nest `rawBody: true`).
