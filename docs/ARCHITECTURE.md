# Tirth Now — Architecture

Tirth Now is a spiritual travel and discovery super-app for the Braj region
(Mathura, Vrindavan, Goverdhan, Barsana, Gokul, Nandgaon). One backend serves
three clients:

| Client | Tech | Audience |
|---|---|---|
| Mobile app | Flutter 3 (Android + iOS) | Pilgrims, tourists, locals |
| Vendor portal | Next.js 14 (App Router) | Hotels, cab operators, restaurants, experience hosts |
| Admin portal | Next.js 14 (App Router) | Tirth Now operations, content, finance, trust & safety |

Guiding principles:

1. **Modular monolith** — one deployable NestJS API, strict module boundaries (ADR-0001).
2. **Provider interfaces everywhere** — every third-party call sits behind an interface with a real and a mock adapter, selected by env (ADR-0003). The full stack runs locally with zero external accounts.
3. **Firebase for client identity, own JWT for authorization** (ADR-0002).
4. **One order state machine** for every bookable thing (ADR-0004).
5. **Money is integer paise. Time is UTC in storage, Asia/Kolkata on display.**
6. **Idempotency** on payment, booking and SOS endpoints.

---

## 1. System context

```mermaid
flowchart LR
  subgraph Clients
    M[Mobile app<br/>Flutter]
    V[Vendor portal<br/>Next.js]
    A[Admin portal<br/>Next.js]
  end

  subgraph Platform["Tirth Now platform"]
    API[NestJS API<br/>REST + Socket.IO]
    W[BullMQ workers<br/>same codebase, worker entrypoint]
    PG[(PostgreSQL 16<br/>+ pgvector, pg_trgm)]
    R[(Redis<br/>cache, queues, rate limits, socket adapter)]
    S3[(Cloudflare R2<br/>MinIO locally)]
  end

  subgraph External["External providers (all behind interfaces)"]
    FB[Firebase Auth + FCM + Crashlytics]
    RZP[Razorpay + Route]
    MSG[MSG91 SMS]
    WA[WhatsApp Business API]
    GM[Google Maps Platform]
    LLM[Claude API / OpenAI]
    GCP[Google STT / TTS / Vision / Translate]
    VID[Cloudflare Stream / Mux]
    OW[OpenWeather]
    TR[Transit provider]
    SEN[Sentry]
  end

  M -- HTTPS / WSS --> API
  V -- HTTPS / WSS --> API
  A -- HTTPS / WSS --> API
  M -- presigned PUT --> S3
  V -- presigned PUT --> S3
  A -- presigned PUT --> S3
  M -- sign-in --> FB

  API --> PG
  API --> R
  W --> PG
  W --> R
  API --> S3
  W --> S3

  API --> FB
  API --> RZP
  RZP -- webhooks --> API
  W --> MSG
  W --> WA
  W --> FB
  API --> GM
  API --> LLM
  W --> LLM
  API --> GCP
  W --> VID
  VID -- webhooks --> API
  API --> OW
  API --> TR
  API --> SEN
```

### Deployable units

| Unit | Entrypoint | Notes |
|---|---|---|
| `api` (HTTP) | `apps/api/src/main.ts` | REST, Swagger at `/docs`, Socket.IO gateway (Redis adapter for horizontal scale) |
| `api` (worker) | `apps/api/src/worker.ts` | Same image, different command. Runs BullMQ processors and cron schedulers. No HTTP listener except `/healthz`. |
| `vendor-portal` | Next.js server | Talks to API only through `@tirth-now/api-client` |
| `admin-portal` | Next.js server | Same |
| `mobile` | Store builds via Codemagic | Talks to API through a Dio client generated/handwritten against OpenAPI |

---

## 2. Module boundaries (API)

```mermaid
flowchart TB
  subgraph Platform_Core["core (cross-cutting, no business logic)"]
    CFG[config]
    PRS[prisma]
    LOG[logging + request-id]
    QUE[queue]
    CACHE[cache]
    PROV[providers<br/>interfaces + adapters]
  end

  subgraph Domain
    IDN[identity<br/>auth, users, devices, roles]
    CAT[catalog<br/>cities, temples, aarti, festivals,<br/>POIs, explore, parikrama, search]
    VEN[vendors<br/>onboarding, KYC, staff, bank]
    INV[inventory<br/>hotels, rooms, vehicles,<br/>menus, experiences]
    ORD[orders<br/>state machine, history,<br/>cancellations]
    PAY[payments<br/>Razorpay, webhooks, refunds,<br/>commission, ledger, payouts]
    REEL[reels<br/>upload, transcode, feed,<br/>social graph, reports]
    REV[reviews]
    AI[ai<br/>RAG, chat, planner, voice,<br/>vision, moderation]
    SAF[safety<br/>SOS, emergency contacts]
    NOT[notifications<br/>FCM, SMS, WA, templates]
    WEA[weather]
    TRN[transit]
    FIL[files<br/>presigned uploads, media assets]
    RT[realtime<br/>Socket.IO gateway]
    ADM[admin<br/>KPIs, CMS, moderation,<br/>config, audit]
  end

  ORD --> INV
  ORD --> PAY
  PAY --> ORD
  INV --> VEN
  VEN --> FIL
  REEL --> FIL
  REEL --> AI
  REV --> AI
  AI --> CAT
  SAF --> NOT
  ORD --> NOT
  CAT --> NOT
  ORD --> RT
  CAT --> RT
  ADM --> CAT
  ADM --> VEN
  ADM --> REEL
  ADM --> PAY
  ADM --> AI

  Domain -.uses.-> Platform_Core
```

### Boundary rules

1. A module exposes a **public service facade** (`<module>.facade.ts` exporting a `@Injectable` class) and its DTO/event types from `index.ts`. Other modules import **only** from that `index.ts`. Enforced by an ESLint `no-restricted-imports` rule (`@/modules/*/!(index)`).
2. A module owns its tables. Only that module's repository code queries them. Cross-module reads go through the facade; cross-module writes go through the facade or a domain event.
3. **Domain events** (in-process, `@nestjs/event-emitter`) for fire-and-forget reactions — e.g. `order.confirmed` → notifications, realtime, ledger. Anything that must survive a crash is pushed onto a BullMQ queue by the listener.
4. `payments` ↔ `orders` is the one intentional bidirectional relationship: orders calls `PaymentsFacade.createIntent()`; payments emits `payment.captured` / `refund.processed` events that orders consumes. No direct circular imports.
5. `admin` is an orchestration layer: it owns `audit_logs` and `app_config`, and calls other modules' facades for everything else.
6. No module calls an external SDK directly — only through `core/providers`.

### Module → table ownership (summary)

| Module | Owns |
|---|---|
| identity | users, user_profiles, roles, user_roles, devices, refresh_tokens, emergency_contacts* (shared with safety via facade) |
| catalog | cities, temples, aarti_schedules, festivals, pois, explore_items, parikrama_routes, parikrama_route_stops |
| files | media_assets |
| vendors | vendors, vendor_kyc_documents, vendor_staff, vendor_bank_accounts |
| inventory | hotels, room_types, room_inventory, vehicles, cab_fares, restaurants, menu_items, experiences, experience_slots |
| orders | orders, order_items, order_status_history, cancellations, idempotency_keys |
| payments | payments, payment_events, refunds, commission_rules, ledger_entries, payouts |
| reviews | reviews |
| reels | reels, reel_likes, reel_comments, reel_saves, follows, reports, moderation_actions |
| ai | knowledge_documents, knowledge_chunks, chat_sessions, chat_messages, itineraries, itinerary_days, itinerary_items, ai_usage |
| safety | sos_events (emergency_contacts read via identity facade) |
| notifications | notifications, notification_templates |
| admin | audit_logs, app_config |

\* `emergency_contacts` lives in identity (it is profile data) and is read by safety.

### Folder layout inside `apps/api/src`

```
main.ts                 # HTTP bootstrap
worker.ts               # BullMQ worker bootstrap
app.module.ts
core/
  config/               # Zod env schema → typed ConfigService
  prisma/
  logging/              # pino, request-id middleware
  http/                 # exception filter, interceptors, pipes
  auth/                 # JwtGuard, RolesGuard, @Roles(), @CurrentUser()
  idempotency/          # @Idempotent() interceptor backed by idempotency_keys
  queue/                # BullMQ module + queue names
  cache/
  providers/
    payment/            # payment.provider.ts, razorpay.adapter.ts, mock.adapter.ts
    sms/  whatsapp/  push/  maps/  llm/  embedding/  stt/  tts/
    vision/  translate/  storage/  video/  weather/  transit/  firebase-auth/
modules/
  identity/  catalog/  vendors/  inventory/  orders/  payments/  reviews/
  reels/  ai/  safety/  notifications/  weather/  transit/  files/
  realtime/  admin/
    <module>.module.ts
    <module>.facade.ts
    index.ts
    controllers/  services/  dto/  events/  processors/  __tests__/
```

---

## 3. Request flow

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant H as Helmet / CORS
  participant RID as RequestId + pino
  participant TH as Throttler (Redis)
  participant G as JwtGuard → RolesGuard
  participant IDM as Idempotency interceptor
  participant VP as ValidationPipe (class-validator)
  participant CT as Controller
  participant SV as Service / Facade
  participant DB as Prisma (Postgres)
  participant EV as EventEmitter → BullMQ
  participant EF as Global exception filter

  C->>H: HTTPS request (Authorization: Bearer, Idempotency-Key?)
  H->>RID: attach x-request-id, child logger
  RID->>TH: per-IP + per-user limits
  TH->>G: verify access JWT (15 min), check @Roles()
  G->>IDM: if @Idempotent(): look up key
  alt key seen with same body hash
    IDM-->>C: replay stored response
  else new key
    IDM->>VP: continue
  end
  VP->>CT: typed DTO (whitelist + forbidNonWhitelisted)
  CT->>SV: call
  SV->>DB: transaction
  SV->>EV: emit domain event (after commit)
  SV-->>CT: result
  CT-->>IDM: store response under key (24 h)
  IDM-->>C: 2xx JSON
  Note over EF: any thrown error → normalized<br/>{ error: { code, message, details, requestId } }<br/>+ Sentry capture for 5xx
```

### Auth token exchange

```mermaid
sequenceDiagram
  autonumber
  participant App as Mobile app
  participant FB as Firebase Auth
  participant API as API /auth
  participant DB as Postgres

  App->>FB: phone OTP / Google / Apple / anonymous
  FB-->>App: Firebase ID token
  App->>API: POST /v1/auth/firebase { idToken, device }
  API->>FB: verifyIdToken via FirebaseAuthProvider (mock accepts mock:uid:phone)
  API->>DB: upsert user by firebase_uid, upsert device
  API->>DB: insert refresh_token (sha256 hash, family_id, expires 30 d)
  API-->>App: { accessToken (JWT 15 min), refreshToken (opaque), user }
  Note over App: tokens in flutter_secure_storage

  App->>API: POST /v1/auth/refresh { refreshToken }
  API->>DB: find by hash
  alt valid & not used
    API->>DB: mark used, insert new token (same family)
    API-->>App: new pair
  else already used (reuse detected)
    API->>DB: revoke entire family
    API-->>App: 401 → force re-login
  end
```

Portals use `POST /v1/auth/portal/login` (email + argon2id password, optional
email/SMS OTP second step) and receive the same token pair; the portal stores the
refresh token in an `httpOnly; Secure; SameSite=Strict` cookie set by a Next.js
route handler, never in JS-accessible storage.

---

## 4. Booking (order) state machine

All bookable products — `hotel`, `cab`, `food`, `experience`, `transit` — share
one `orders` table and one state machine (ADR-0004). Type-specific details live
in `order_items` and the type-specific inventory hold.

```mermaid
stateDiagram-v2
  [*] --> pending: create order<br/>(inventory held, payment intent created)

  pending --> confirmed: payment.captured<br/>+ vendor auto/explicit accept
  pending --> cancelled: user cancels / payment failed /<br/>hold expires (15 min) / vendor rejects

  confirmed --> in_progress: check-in / ride started /<br/>food picked up / experience started
  confirmed --> cancelled: user or vendor cancels<br/>(cancellation policy applied)

  in_progress --> completed: check-out / ride ended /<br/>delivered / experience ended
  in_progress --> cancelled: admin only (exceptional)

  cancelled --> refunded: refund.processed<br/>(only if a payment was captured)
  completed --> refunded: admin-approved dispute refund

  completed --> [*]
  refunded --> [*]
  cancelled --> [*]: nothing captured
```

Rules:

- Transitions are declared in one table (`ORDER_TRANSITIONS`) mapping `from → to → { allowedActors, guard, sideEffects }`. `OrdersService.transition(orderId, to, actor, reason)` is the **only** writer of `orders.status`.
- Every transition runs in a DB transaction with `SELECT … FOR UPDATE` on the order row, writes `order_status_history (from, to, actor_type, actor_id, reason, metadata)`, then emits `order.<status>` after commit.
- Partial refunds keep the order in its current terminal state and record a `refunds` row; `refunded` means fully refunded.
- Inventory holds: hotel nights decrement `room_inventory.available` inside the order-create transaction (row lock per date); a `release-expired-holds` repeatable job cancels `pending` orders past `hold_expires_at` and restores inventory.
- `transit` orders are deep-link / affiliate bookings in v1: created as `pending`, marked `confirmed` by provider callback or remain informational.

---

## 5. Payment + payout flow

```mermaid
sequenceDiagram
  autonumber
  participant App as Mobile app
  participant API as API (orders, payments)
  participant RZP as PaymentProvider (Razorpay / mock)
  participant DB as Postgres
  participant Q as BullMQ
  participant V as Vendor bank (Route)

  App->>API: POST /v1/orders (Idempotency-Key)
  API->>DB: create order(pending) + items + inventory hold
  API->>RZP: createOrder(amount_paise, receipt=order.id, notes)
  RZP-->>API: provider_order_id
  API->>DB: payments(status=created)
  API-->>App: { orderId, providerOrderId, keyId, amount }

  App->>RZP: Razorpay Checkout SDK
  RZP-->>App: payment_id, signature
  App->>API: POST /v1/payments/verify { ids, signature }
  API->>API: HMAC verify (provider.verifyPaymentSignature)
  API->>DB: payments(status=authorized|captured)

  RZP->>API: POST /v1/payments/webhooks/razorpay (X-Razorpay-Signature)
  API->>API: verify webhook signature
  API->>DB: INSERT payment_events (provider_event_id UNIQUE) — duplicate → 200 no-op
  API->>DB: payments.captured, order → confirmed
  API->>DB: ledger: commission calc via commission_rules
  Note over DB: double-entry ledger_entries<br/>DR platform_clearing  total<br/>CR vendor_payable    total − commission − GST on commission<br/>CR platform_revenue  commission<br/>CR gst_payable       GST on commission

  Note over API,Q: after completion + settlement hold (T+N days, configurable)
  Q->>API: payouts.schedule (daily cron)
  API->>DB: aggregate vendor_payable → payouts(status=pending_approval)
  Note over API: admin approves in admin portal
  API->>RZP: Route transfer(vendor linked_account_id, amount)
  RZP->>V: settlement
  RZP->>API: webhook transfer.processed
  API->>DB: payouts(status=paid), ledger DR vendor_payable / CR platform_clearing
```

Refunds: `POST /v1/orders/:id/cancel` → cancellation policy computes refundable
paise → `PaymentProvider.refund()` → `refunds(status=pending)` → webhook
`refund.processed` → `refunds(status=processed)`, reversing ledger entries, order
→ `refunded` when fully refunded. If a vendor was already paid out, a negative
`vendor_payable` balance is carried forward to the next payout.

---

## 6. SOS flow

```mermaid
sequenceDiagram
  autonumber
  participant U as User (mobile)
  participant API as API /safety
  participant DB as Postgres
  participant Q as BullMQ (sos queue, priority 1)
  participant SMS as SmsProvider
  participant WA as WhatsAppProvider
  participant PUSH as PushProvider (FCM)
  participant RT as Realtime gateway
  participant ADM as Admin portal

  U->>U: long-press SOS → 5 s countdown (cancellable)
  U->>API: POST /v1/safety/sos { lat, lng, accuracy, battery } (Idempotency-Key)
  API->>API: rate limit: 3 / 10 min per user (still logged when exceeded)
  API->>DB: sos_events(status=triggered, share_token)
  API->>Q: enqueue sos.dispatch (attempts 5, backoff exp)
  API-->>U: 202 { sosId, shareUrl }
  Q->>DB: load emergency_contacts + nearest police/hospital POIs
  par fan-out
    Q->>SMS: DLT template SOS_ALERT(name, link)
    Q->>WA: template sos_alert (stub until approved)
    Q->>PUSH: to contacts who are app users
  end
  Q->>DB: notifications rows + sos_events.dispatched_at
  Q->>RT: emit admin:sos.new
  RT-->>ADM: live SOS board
  loop every 15 s while active (max 2 h)
    U->>API: POST /v1/safety/sos/:id/location
    API->>RT: emit sos:<share_token>.location
  end
  Note over U,API: public live-location page: GET /s/:shareToken<br/>(no auth, token is 128-bit random, expires with event)
  U->>API: POST /v1/safety/sos/:id/resolve
  API->>DB: status=resolved
```

---

## 7. RAG pipeline (AI Braj Guide)

```mermaid
flowchart LR
  subgraph Ingestion["Ingestion (worker, queue: ai.ingest)"]
    D[Admin uploads document<br/>PDF / MD / URL / text] --> AP{Admin approves?}
    AP -- yes --> EX[Extract text]
    EX --> CH[Chunk ~500 tokens,<br/>80 token overlap,<br/>heading-aware]
    CH --> EM[EmbeddingProvider<br/>batch, 1536 dims]
    EM --> ST[(knowledge_chunks<br/>vector 1536, HNSW cosine,<br/>city_id, temple_id, lang)]
  end

  subgraph Query["Query (API, SSE)"]
    Q[User question<br/>+ session id + city/temple context] --> GR{Guardrail classifier<br/>cheap model}
    GR -- off-topic --> RF[Polite refusal / redirect]
    GR -- on-topic --> CA{Redis answer cache<br/>hash of normalized q + filters}
    CA -- hit --> OUT
    CA -- miss --> QE[Embed query]
    QE --> RET[Top-k=8 cosine<br/>+ metadata filter]
    Q --> TOOLS[Structured facts from DB:<br/>aarti_schedules, temples,<br/>festivals, weather]
    RET --> PR[Prompt assembly:<br/>system guardrails + memory summary<br/>+ chunks with ids + DB facts]
    TOOLS --> PR
    PR --> LLM[LlmProvider stream<br/>Claude default / OpenAI]
    LLM --> PP[Post-process:<br/>citation ids → sources,<br/>moderation check]
    PP --> OUT[SSE tokens + final<br/>citations event]
    OUT --> MEM[(chat_messages,<br/>ai_usage quota)]
  end
```

Key rules:

- **Aarti times are never generated by the model.** The planner and chat use a `get_aarti_schedule(temple_id, date)` tool backed by `aarti_schedules`; the system prompt forbids stating times not present in tool output.
- Model routing: a cheap model handles classification, short factual queries and moderation; the default model handles chat and itinerary generation. Both are configured by env (`LLM_MODEL_DEFAULT`, `LLM_MODEL_CHEAP`).
- Per-user daily quota (`AI_DAILY_QUOTA_*`) tracked in Redis, persisted to `ai_usage` for reporting.
- Trip planner output is JSON validated with a Zod schema from `@tirth-now/shared-types`; invalid output is retried once with the validation errors appended, then fails gracefully.

---

## 8. Async work (BullMQ queues)

| Queue | Producers | Jobs | Retry policy |
|---|---|---|---|
| `sos` | safety | dispatch, location fan-out | 5 attempts, exp backoff 2 s, priority 1 |
| `notifications` | many | push, sms, whatsapp, email, scheduled aarti reminders | 5 attempts, exp backoff |
| `payments` | payments | webhook post-processing, refund polling, reconciliation | 8 attempts |
| `payouts` | cron, admin | schedule, execute transfer | 3 attempts, then manual |
| `orders` | cron | release expired holds, auto-complete | 3 attempts |
| `media` | reels, files | transcode (VideoProvider), image resize, thumbnails | 3 attempts |
| `ai` | ai, admin | ingest document, embed chunks, moderate content | 3 attempts |

Repeatable jobs: aarti reminder scheduler (every 5 min), expired hold release
(every minute), payout scheduling (daily 02:00 IST), weather pre-warm (every 15 min).

---

## 9. Realtime

Socket.IO gateway at `/rt` with the Redis adapter. Clients authenticate with the
access JWT in the handshake `auth.token`. Rooms:

| Room | Who joins | Events |
|---|---|---|
| `aarti:<templeId>` | anyone | `aarti.countdown`, `aarti.live` |
| `order:<orderId>` | order owner, vendor staff, admin | `order.status`, `cab.location` |
| `vendor:<vendorId>` | vendor staff | `order.new`, `order.status` |
| `admin` | admins | `sos.new`, `moderation.new`, `kpi.tick` |
| `sos:<shareToken>` | public share viewers (read-only) | `sos.location` |

Countdowns are computed on the client from server-provided `next_at` timestamps;
the server only pushes on schedule changes, so the gateway stays cheap.

---

## 10. Cross-cutting concerns

| Concern | Approach |
|---|---|
| Config | Zod schema validates `process.env` at boot; app refuses to start on invalid config |
| Logging | pino JSON, `x-request-id` propagated to workers via job data; PII redaction paths for phone, email, tokens |
| Errors | One error envelope `{ error: { code, message, details?, requestId } }`; stable `code` strings shared in `@tirth-now/shared-types` |
| Validation | class-validator in API; Zod in portals (schemas from `shared-types`); Flutter form validators |
| Rate limiting | `@nestjs/throttler` with Redis storage; stricter buckets for auth, OTP, SOS, AI |
| Security | Helmet, strict CORS allowlist, argon2id for portal passwords, refresh tokens hashed (sha256), webhook signature verification, presigned URLs with content-type + size limits, RBAC guard on every non-public route |
| Observability | Sentry (API, portals, Flutter), Crashlytics, `/healthz` (liveness) and `/readyz` (DB + Redis) |
| i18n | `*_i18n` JSONB columns `{ "en": "...", "hi": "..." }` for CMS content; Flutter ARB files for UI copy |
| Time | `timestamptz` in UTC; `Asia/Kolkata` conversion only at presentation; aarti schedules stored as local wall-clock `time` + rules, resolved to UTC instants per date by the catalog service |
| Money | `integer` paise columns suffixed `_paise`; `bigint` for ledger/aggregates; no floats anywhere |
| API versioning | URI prefix `/v1` |

---

## 11. Environments

| Env | Infra | Providers |
|---|---|---|
| local | docker-compose: Postgres 16 + pgvector, Redis 7, MinIO, Mailpit | all `mock` |
| ci | service containers | all `mock` |
| staging | managed Postgres + Redis, R2 | real sandbox/test keys |
| production | same, scaled API + worker | real |

See `docs/INTEGRATIONS.md` for every provider and its env vars.
