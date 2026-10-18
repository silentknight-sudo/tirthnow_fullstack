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
explicitly allowed by `ALLOW_MOCK_PROVIDERS`, a comma list of capability names
(`firebase_auth`, `email`, `storage`, `maps`, `payment`, `push`, `sms`, `whatsapp`,
`weather`, `video`, `moderation`, `llm`, `embedding`, `stt`, `tts`, `vision`). Selecting a
real adapter without its credentials also fails at boot. The check lives in
`apps/api/src/core/config/env.schema.ts`.

The shared call policy is `callWithPolicy()` in
`apps/api/src/core/providers/call-policy.ts` (timeout, exponential backoff with
full jitter, retry only on network errors / 429 / 5xx) with a per-provider circuit
breaker (5 consecutive transient failures → open for 30 s → `503 PROVIDER_UNAVAILABLE`).
Non-2xx HTTP responses become `ProviderHttpError` (`core/providers/http-error.ts`).

Every provider below is implemented (Phase 2) with a real adapter and a mock, except
Transit (mock only until a data partner is chosen, ADR-0012). Mock outboxes for email,
push, SMS and WhatsApp are visible at `GET /v1/dev/outbox` (non-production).

---

| Interface | Selector env | Real adapter(s) | Env vars (real) | Mock behaviour |
|---|---|---|---|---|
| `FirebaseAuthProvider` | `FIREBASE_AUTH_PROVIDER=mock\|firebase` | firebase-admin `verifyIdToken(token, checkRevoked)` | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Accepts `mock:<uid>`, `mock:<uid>:<+E164>`, `mock:<uid>:<email>`, `mock:<uid>:<+E164>:<email>`; `mock:guest:<uid>` = anonymous. Anything else → `AUTH_INVALID_FIREBASE_TOKEN`. |
| `PushProvider` | `PUSH_PROVIDER=mock\|fcm` | FCM HTTP v1 via firebase-admin `sendEachForMulticast` (batches of 500, Android channel + APNs priority) | (same Firebase vars) | In-memory outbox; tokens starting with `invalid` are reported dead (and removed from `devices`). |
| `SmsProvider` | `SMS_PROVIDER=mock\|msg91` | MSG91 Flow API v5 (DLT templates; template id from `notification_templates.dlt_template_id`) | `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_DLT_ENTITY_ID` | Outbox; numbers added to `rejectNumbers` fail permanently (tests). A template without a DLT id is refused by the real adapter. |
| `WhatsAppProvider` | `WHATSAPP_PROVIDER=mock\|meta` | WhatsApp Business Cloud API, template messages (Graph v21.0) | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` | Outbox. Stays the default until Meta approves the templates. |
| `EmailProvider` | `EMAIL_PROVIDER=mock\|smtp` | SMTP via nodemailer (Mailpit locally, SES/Postmark later) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Last 200 messages in memory. |
| `PaymentProvider` | `PAYMENT_PROVIDER=mock\|razorpay` | Razorpay Orders, Payments, Refunds, Route (linked accounts, transfers), webhook signature (fetch-based) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | `order_mock_*` ids; HMAC with `MOCK_PAYMENT_SECRET`. `POST /v1/dev/payments/checkout {providerOrderId, outcome?, deliverWebhook?}` simulates checkout and the `payment.captured` webhook. Amounts ending in 13 paise fail. Refunds complete immediately unless `holdRefunds` is set (then a `refund.processed` webhook finishes them). |
| `StorageProvider` | `STORAGE_PROVIDER=mock\|s3` | S3-compatible (Cloudflare R2 in prod, MinIO locally) | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_PUBLIC`, `S3_BUCKET_PRIVATE`, `MEDIA_PUBLIC_BASE_URL` | In memory, with HMAC-signed URLs served by `/v1/dev/storage` (lost on restart). |
| `VideoProvider` | `VIDEO_PROVIDER=mock\|cloudflare_stream\|mux` | Cloudflare Stream (copy from URL) / Mux (asset from URL, public playback) | `CF_STREAM_ACCOUNT_ID`, `CF_STREAM_API_TOKEN`, `CF_STREAM_WEBHOOK_SECRET` / `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET` | Ready immediately, playing the uploaded MP4. With `holdAssets` set, finishes via a webhook signed with `MOCK_VIDEO_SECRET` (`x-mock-signature`). |
| `MapsProvider` | `MAPS_PROVIDER=mock\|google` | Google Routes API `computeRoutes` | `GOOGLE_MAPS_API_KEY` (server); mobile uses separate restricted keys | Haversine × 1.3 road factor, 25 km/h. |
| `LlmProvider` | `LLM_PROVIDER=mock\|anthropic` | Claude Messages API via `@anthropic-ai/sdk`: adaptive thinking, effort, strict tools, structured output, server-side refusal fallback (ADR-0015) | `ANTHROPIC_API_KEY`, `LLM_MODEL_DEFAULT` (`claude-opus-5-5`), `LLM_MODEL_CHEAP` (`claude-haiku-5-5`) | Recognises the `[task:…]` tag of each AI prompt: classifier (off-topic regex), moderation (blocklist), summaries, chat (calls `get_aarti_schedule` for aarti questions, cites `[1]`), planner (keeps every candidate). |
| `EmbeddingProvider` | `EMBEDDING_PROVIDER=mock\|openai` | OpenAI `text-embedding-3-small`, 1536-d | `OPENAI_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS=1536` | Bag-of-words hashed to 1536-d unit vectors: texts that share words are close. |
| `SpeechToTextProvider` | `STT_PROVIDER=mock\|google` | Google Cloud Speech-to-Text v1 (`hi-IN`, alternative `en-IN`) | `GOOGLE_CLOUD_API_KEY` | Returns "Banke Bihari mandir kab khulta hai?", or the text after `TRANSCRIPT:` inside the audio bytes (tests). |
| `TextToSpeechProvider` | `TTS_PROVIDER=mock\|google` | Google Cloud Text-to-Speech v1, MP3 | `GOOGLE_CLOUD_API_KEY` | Short silent MP3. |
| `VisionProvider` | `VISION_PROVIDER=mock\|google` | Google Cloud Vision v1 `LANDMARK_DETECTION` | `GOOGLE_CLOUD_API_KEY` | Always "Banke Bihari Temple" at 0.42; the API combines it with the photo location. |
| `ModerationProvider` | `MODERATION_PROVIDER=mock\|llm` | Cheap Claude model with a JSON schema; fails open | (LLM vars) | Small word blocklist + phone numbers / link farms as spam. |
| `WeatherProvider` | `WEATHER_PROVIDER=mock\|openweather` | OpenWeather current + 5-day/3-hour forecast (free tier), aggregated per IST day | `OPENWEATHER_API_KEY` | Monthly climate normals for Mathura–Vrindavan (hot in May, fog in Jan). |
| `TransitProvider` | `TRANSIT_PROVIDER=mock` | Partner API (TBD, ADR-0012) | TBD | Static timetable around Braj with running days and IRCTC deep links. |
| Error tracking | `SENTRY_DSN` (empty = disabled) | Sentry | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` | Disabled (wired in Phase 6). |

### Client-side keys

Clients only ever hold **publishable/restricted** keys:

| Client | Keys |
|---|---|
| Mobile | Firebase config (`google-services.json`, `GoogleService-Info.plist`), Google Maps SDK key (restricted to app signature/bundle id), Razorpay `key_id` (returned by API per order), Sentry DSN |
| Portals | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (HTTP-referrer restricted) |

Secrets (Razorpay secret, LLM and embedding keys, MSG91, Google API key) live only in
the API's environment.

### Mobile app adapters (Phase 3)

The Flutter app follows the same pattern on the client (ADR-0017), selected at build
time with `--dart-define` (no secrets are compiled in):

| Capability | Interface | Real | Mock (default) | Switch |
|---|---|---|---|---|
| Identity | `IdentityProvider` | Firebase Auth phone OTP / anonymous | mints `mock:<uid>:<phone>` tokens; OTP `123456` | `AUTH_PROVIDER=firebase` |
| Payment checkout | `PaymentCheckout` | `razorpay_flutter` | test sheet → `POST /v1/dev/payments/checkout` (non-production API, `PAYMENT_PROVIDER=mock`) | `PAYMENT_PROVIDER=razorpay`, `RAZORPAY_KEY_ID` |
| Location | `LocationService` | geolocator (falls back to an approximate Vrindavan fix, accuracy 5 km, when GPS is off) | — | — |

Other build-time setting: `API_BASE_URL` (API origin without `/v1`).

### Webhooks

| Source | Endpoint | Verification |
|---|---|---|
| Razorpay | `POST /v1/payments/webhooks/razorpay` | HMAC-SHA256 of raw body with `RAZORPAY_WEBHOOK_SECRET`, header `X-Razorpay-Signature` |
| Mock payments | `POST /v1/payments/webhooks/mock` | HMAC-SHA256 of raw body with `MOCK_PAYMENT_SECRET`, header `x-mock-signature` |
| Cloudflare Stream | `POST /v1/reels/webhooks/video` | `Webhook-Signature: time=…,sig1=…` = HMAC-SHA256(`CF_STREAM_WEBHOOK_SECRET`, `time.body`), ≤ 5 min old |
| Mux | `POST /v1/reels/webhooks/video` | `mux-signature: t=…,v1=…` = HMAC-SHA256(`MUX_WEBHOOK_SECRET`, `t.body`), ≤ 5 min old |
| Mock video | `POST /v1/reels/webhooks/video` | `x-mock-signature` = HMAC of raw body with `MOCK_VIDEO_SECRET` |

Webhooks with an invalid signature are rejected with 401 `WEBHOOK_SIGNATURE_INVALID` and
nothing is stored. Delivery-report webhooks for MSG91 and WhatsApp are planned for Phase 6.

Raw bodies are preserved for these routes (Nest `rawBody: true`).
