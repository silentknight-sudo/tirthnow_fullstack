# Tirth Now — Data Model

PostgreSQL 16 with extensions `pgcrypto` (UUIDs), `pg_trgm` (fuzzy search),
`unaccent`, `vector` (pgvector), `citext`. Schema is defined in Prisma
(`apps/api/prisma/schema.prisma`); raw-SQL migrations add what Prisma cannot
express (HNSW/GIN indexes, generated `tsvector` columns, partial unique indexes,
check constraints).

## Conventions

| Convention | Rule |
|---|---|
| Primary keys | `id uuid DEFAULT gen_random_uuid()` |
| Timestamps | `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL` (Prisma `@updatedAt`). All UTC. Display in `Asia/Kolkata`. |
| Soft delete | `deleted_at timestamptz NULL` on user-facing/catalog/vendor tables (marked **SD** below). Prisma client extension filters `deleted_at IS NULL` by default. Unique indexes are partial (`WHERE deleted_at IS NULL`). |
| Money | `integer` paise, column suffix `_paise` (max ≈ ₹2.1 crore per row). Ledger and aggregates use `bigint`. Currency is always INR; a `currency char(3) DEFAULT 'INR'` column exists on payments for future-proofing. |
| Enums | Postgres enums via Prisma for closed sets (status, type). Open sets (POI category, amenity) are text + check or lookup table. |
| i18n | Translatable CMS text in `*_i18n jsonb` shaped `{"en": "...", "hi": "..."}`; `en` required. |
| Geo | `lat double precision`, `lng double precision` + btree index on `(lat, lng)`; distance via haversine SQL function. (PostGIS deferred — ADR candidate if geo queries grow.) |
| Naming | snake_case tables (plural) and columns; Prisma models PascalCase singular with `@@map`. |
| FKs | `ON DELETE RESTRICT` by default; `CASCADE` only for pure child rows (e.g. `order_items`, `reel_likes`). |
| Audit | Every admin/vendor write produces an `audit_logs` row (via interceptor). |

---

## ERD — Identity

```mermaid
erDiagram
  users ||--o| user_profiles : has
  users ||--o{ user_roles : has
  roles ||--o{ user_roles : grants
  users ||--o{ devices : registers
  users ||--o{ refresh_tokens : holds
  users ||--o{ emergency_contacts : lists

  users {
    uuid id PK
    text firebase_uid UK "null for portal-only users"
    citext email UK
    text phone_e164 UK
    text password_hash "argon2id, portal users only"
    boolean is_guest
    user_status status "active|suspended|deleted"
    timestamptz last_login_at
    timestamptz deleted_at "SD"
  }
  user_profiles {
    uuid user_id PK, FK
    text display_name
    text avatar_media_id FK
    text preferred_lang "en|hi"
    uuid home_city_id FK
    jsonb accessibility "wheelchair, elderly, etc"
    jsonb notification_prefs
  }
  roles {
    uuid id PK
    role_key key UK "user|vendor_owner|vendor_staff|admin|super_admin"
    jsonb permissions
  }
  user_roles {
    uuid user_id PK, FK
    uuid role_id PK, FK
    uuid vendor_id FK "scope for vendor roles"
  }
  devices {
    uuid id PK
    uuid user_id FK
    text fcm_token UK
    text platform "android|ios|web"
    text app_version
    text locale
    timestamptz last_seen_at
  }
  refresh_tokens {
    uuid id PK
    uuid user_id FK
    uuid device_id FK
    text token_hash UK "sha256"
    uuid family_id "rotation chain"
    timestamptz expires_at
    timestamptz used_at
    timestamptz revoked_at
    text ip
    text user_agent
  }
  emergency_contacts {
    uuid id PK
    uuid user_id FK
    text name
    text phone_e164
    text relation
    boolean notify_whatsapp
    smallint priority
  }
```

## ERD — Catalog & media

```mermaid
erDiagram
  cities ||--o{ temples : contains
  cities ||--o{ pois : contains
  cities ||--o{ explore_items : contains
  cities ||--o{ festivals : hosts
  temples ||--o{ aarti_schedules : has
  temples ||--o{ festivals : "celebrates (optional)"
  parikrama_routes ||--o{ parikrama_route_stops : has
  temples ||--o{ parikrama_route_stops : "is stop"
  media_assets ||--o{ temples : "cover"

  cities {
    uuid id PK
    text slug UK "mathura, vrindavan, ..."
    jsonb name_i18n
    double lat
    double lng
    smallint sort_order
  }
  temples {
    uuid id PK
    uuid city_id FK
    text slug UK
    jsonb name_i18n
    jsonb description_i18n
    jsonb history_i18n
    double lat
    double lng
    text address
    jsonb opening_hours "per weekday ranges, local time"
    jsonb dress_code_i18n
    text[] tags
    uuid cover_media_id FK
    uuid[] gallery_media_ids
    smallint crowd_level "0-4, updated by ops/heuristic"
    boolean is_published
    tsvector search_vector "generated"
    timestamptz deleted_at "SD"
  }
  aarti_schedules {
    uuid id PK
    uuid temple_id FK
    aarti_kind kind "mangla|shringar|rajbhog|utthapan|sandhya|shayan|other"
    jsonb name_i18n
    time local_time "Asia/Kolkata wall clock"
    smallint duration_min
    text recurrence "RRULE, default daily"
    date valid_from
    date valid_to
    text season "summer|winter|all"
    boolean is_live_streamed
    text stream_url
  }
  festivals {
    uuid id PK
    uuid city_id FK
    uuid temple_id FK
    jsonb name_i18n
    jsonb description_i18n
    date starts_on
    date ends_on
    jsonb crowd_advisory_i18n
    uuid cover_media_id FK
  }
  pois {
    uuid id PK
    uuid city_id FK
    poi_category category "hospital|police|pharmacy|atm|parking|toilet|water|ghat|other"
    jsonb name_i18n
    double lat
    double lng
    text phone_e164
    boolean is_24x7
    boolean is_emergency
    jsonb metadata
    timestamptz deleted_at "SD"
  }
  explore_items {
    uuid id PK
    uuid city_id FK
    explore_kind kind "ghat|kund|van|market|museum|food_spot|story"
    jsonb title_i18n
    jsonb body_i18n
    double lat
    double lng
    uuid cover_media_id FK
    int sort_order
    boolean is_published
    timestamptz deleted_at "SD"
  }
  parikrama_routes {
    uuid id PK
    text slug UK
    jsonb name_i18n
    jsonb description_i18n
    int distance_m
    int est_duration_min
    jsonb polyline "encoded path"
    text difficulty
  }
  parikrama_route_stops {
    uuid route_id PK, FK
    smallint seq PK
    uuid temple_id FK
    uuid poi_id FK
    jsonb note_i18n
  }
  media_assets {
    uuid id PK
    uuid owner_user_id FK
    media_kind kind "image|video|document|audio"
    text storage_key UK
    text mime_type
    int size_bytes
    int width
    int height
    int duration_ms
    media_status status "pending_upload|uploaded|processing|ready|failed"
    jsonb variants "resized/HLS renditions"
    text blurhash
    timestamptz deleted_at "SD"
  }
```

## ERD — Vendors & inventory

```mermaid
erDiagram
  vendors ||--o{ vendor_kyc_documents : submits
  vendors ||--o{ vendor_staff : employs
  users ||--o{ vendor_staff : "is"
  vendors ||--o{ vendor_bank_accounts : has
  vendors ||--o{ hotels : lists
  vendors ||--o{ vehicles : lists
  vendors ||--o{ restaurants : lists
  vendors ||--o{ experiences : lists
  hotels ||--o{ room_types : offers
  room_types ||--o{ room_inventory : "per date"
  vehicles ||--o{ cab_fares : priced_by
  restaurants ||--o{ menu_items : serves
  experiences ||--o{ experience_slots : scheduled

  vendors {
    uuid id PK
    uuid owner_user_id FK
    vendor_type type "hotel|cab|restaurant|experience|multi"
    text legal_name
    text display_name
    text gstin
    text pan
    uuid city_id FK
    vendor_status status "draft|kyc_pending|kyc_rejected|active|suspended"
    text razorpay_linked_account_id
    uuid commission_rule_id FK "override"
    timestamptz approved_at
    uuid approved_by FK
    timestamptz deleted_at "SD"
  }
  vendor_kyc_documents {
    uuid id PK
    uuid vendor_id FK
    kyc_doc_type doc_type "pan|gst|aadhaar|fssai|trade_license|rc|permit|other"
    uuid media_id FK
    kyc_status status "pending|approved|rejected"
    text reviewer_note
    uuid reviewed_by FK
    timestamptz reviewed_at
  }
  vendor_staff {
    uuid id PK
    uuid vendor_id FK
    uuid user_id FK
    text[] permissions "orders.manage, listings.edit, ..."
    boolean is_active
  }
  vendor_bank_accounts {
    uuid id PK
    uuid vendor_id FK
    text account_holder
    text account_number_enc "AES-GCM, app-level"
    text account_last4
    text ifsc
    boolean is_primary
    boolean is_verified
  }
  hotels {
    uuid id PK
    uuid vendor_id FK
    uuid city_id FK
    jsonb name_i18n
    jsonb description_i18n
    double lat
    double lng
    text address
    smallint star_rating
    text[] amenities
    time checkin_time
    time checkout_time
    jsonb cancellation_policy
    numeric rating_avg "denormalized"
    int rating_count
    boolean is_published
    timestamptz deleted_at "SD"
  }
  room_types {
    uuid id PK
    uuid hotel_id FK
    jsonb name_i18n
    smallint max_guests
    int base_price_paise
    int total_rooms
    text[] amenities
    uuid[] media_ids
    timestamptz deleted_at "SD"
  }
  room_inventory {
    uuid room_type_id PK, FK
    date stay_date PK
    int total
    int available "CHECK >= 0"
    int price_paise "seasonal override"
    boolean stop_sell
  }
  vehicles {
    uuid id PK
    uuid vendor_id FK
    vehicle_class class "auto|hatchback|sedan|suv|tempo_traveller|e_rickshaw"
    text registration_no UK
    smallint seats
    text driver_name
    text driver_phone_e164
    uuid driver_user_id FK
    boolean is_active
    timestamptz deleted_at "SD"
  }
  cab_fares {
    uuid id PK
    uuid vendor_id FK
    vehicle_class class
    int base_fare_paise
    int per_km_paise
    int per_min_paise
    int min_fare_paise
    int night_surcharge_pct
    jsonb fixed_routes "e.g. Mathura-Vrindavan"
  }
  restaurants {
    uuid id PK
    uuid vendor_id FK
    uuid city_id FK
    jsonb name_i18n
    double lat
    double lng
    boolean is_pure_veg
    boolean is_satvik
    text fssai_no
    jsonb opening_hours
    jsonb external_links "zomato, swiggy"
    boolean accepts_orders
    timestamptz deleted_at "SD"
  }
  menu_items {
    uuid id PK
    uuid restaurant_id FK
    jsonb name_i18n
    text category
    int price_paise
    boolean is_available
    boolean is_jain
    uuid media_id FK
    timestamptz deleted_at "SD"
  }
  experiences {
    uuid id PK
    uuid vendor_id FK
    uuid city_id FK
    experience_kind kind "guided_tour|boat_ride|parikrama_guide|cooking|workshop|other"
    jsonb title_i18n
    jsonb description_i18n
    int price_paise
    smallint duration_min
    smallint max_group_size
    jsonb cancellation_policy
    timestamptz deleted_at "SD"
  }
  experience_slots {
    uuid id PK
    uuid experience_id FK
    timestamptz starts_at
    int capacity
    int booked
  }
```

## ERD — Orders & payments

```mermaid
erDiagram
  users ||--o{ orders : places
  vendors ||--o{ orders : fulfils
  orders ||--|{ order_items : contains
  orders ||--o{ order_status_history : logs
  orders ||--o| cancellations : "may have"
  orders ||--o{ payments : "paid by"
  payments ||--o{ payment_events : "webhook log"
  payments ||--o{ refunds : "refunded by"
  cancellations ||--o| refunds : triggers
  commission_rules ||--o{ ledger_entries : "applied in"
  orders ||--o{ ledger_entries : produces
  vendors ||--o{ payouts : receives
  payouts ||--o{ ledger_entries : settles

  orders {
    uuid id PK
    text code UK "TN-2610-8F3K2, human friendly"
    uuid user_id FK
    uuid vendor_id FK
    order_type type "hotel|cab|food|experience|transit"
    order_status status "pending|confirmed|in_progress|completed|cancelled|refunded"
    int subtotal_paise
    int tax_paise
    int discount_paise
    int fee_paise
    int total_paise
    int commission_paise "snapshot at confirm"
    uuid commission_rule_id FK
    timestamptz service_starts_at
    timestamptz service_ends_at
    timestamptz hold_expires_at
    jsonb details "type-specific snapshot: guests, pickup/drop, address"
    text idempotency_key
    timestamptz deleted_at
  }
  order_items {
    uuid id PK
    uuid order_id FK
    text item_type "room_night|cab_trip|menu_item|experience_slot|transit_ticket"
    uuid ref_id "room_type / vehicle / menu_item / slot"
    date stay_date
    int quantity
    int unit_price_paise
    int total_paise
    jsonb snapshot "name, attributes at time of order"
  }
  order_status_history {
    uuid id PK
    uuid order_id FK
    order_status from_status
    order_status to_status
    actor_type actor_type "user|vendor|admin|system|provider"
    uuid actor_id
    text reason
    jsonb metadata
    timestamptz created_at
  }
  cancellations {
    uuid id PK
    uuid order_id FK, UK
    actor_type cancelled_by_type
    uuid cancelled_by
    text reason_code
    text reason_text
    int refundable_paise "from policy"
    int penalty_paise
  }
  payments {
    uuid id PK
    uuid order_id FK
    text provider "razorpay|mock"
    text provider_order_id UK
    text provider_payment_id UK
    payment_status status "created|authorized|captured|failed|refunded|partially_refunded"
    int amount_paise
    char currency
    text method "upi|card|netbanking|wallet"
    jsonb raw
    timestamptz captured_at
  }
  payment_events {
    uuid id PK
    text provider
    text provider_event_id UK "idempotency"
    text event_type
    uuid payment_id FK
    jsonb payload
    boolean signature_valid
    timestamptz processed_at
    text processing_error
  }
  refunds {
    uuid id PK
    uuid payment_id FK
    uuid cancellation_id FK
    text provider_refund_id UK
    int amount_paise
    refund_status status "pending|processed|failed"
    text reason
    uuid initiated_by FK
    text idempotency_key UK
  }
  commission_rules {
    uuid id PK
    text name
    order_type order_type "null = all"
    uuid vendor_id FK "null = global"
    uuid city_id FK
    int percent_bps "basis points, 1000 = 10%"
    int flat_paise
    int min_paise
    int max_paise
    timestamptz effective_from
    timestamptz effective_to
    smallint priority
    boolean is_active
  }
  ledger_entries {
    uuid id PK
    uuid txn_id "groups balanced entries"
    ledger_account account "platform_clearing|vendor_payable|platform_revenue|gst_payable|refunds_payable"
    uuid vendor_id FK
    uuid order_id FK
    uuid payout_id FK
    bigint debit_paise
    bigint credit_paise
    text memo
    timestamptz created_at "append-only"
  }
  payouts {
    uuid id PK
    uuid vendor_id FK
    date period_start
    date period_end
    bigint amount_paise
    payout_status status "pending_approval|approved|processing|paid|failed|on_hold"
    text provider_transfer_id UK
    uuid approved_by FK
    timestamptz approved_at
    timestamptz paid_at
    text failure_reason
  }
```

## ERD — Reviews, reels & moderation

```mermaid
erDiagram
  users ||--o{ reviews : writes
  orders ||--o| reviews : "verified by"
  users ||--o{ reels : posts
  reels ||--o{ reel_likes : receives
  reels ||--o{ reel_comments : receives
  reels ||--o{ reel_saves : receives
  users ||--o{ follows : "follower"
  users ||--o{ follows : "followee"
  users ||--o{ reports : files
  reports ||--o{ moderation_actions : "resolved by"

  reviews {
    uuid id PK
    uuid user_id FK
    uuid order_id FK, UK "verified stay/ride"
    review_target target_type "hotel|restaurant|experience|vendor|temple"
    uuid target_id
    smallint rating "1-5"
    text body
    uuid[] media_ids
    text vendor_reply
    timestamptz vendor_replied_at
    moderation_status moderation_status "pending|approved|flagged|removed"
    timestamptz deleted_at "SD"
  }
  reels {
    uuid id PK
    uuid user_id FK
    uuid video_media_id FK
    uuid thumbnail_media_id FK
    text caption
    text[] hashtags
    uuid city_id FK
    uuid temple_id FK
    int duration_ms
    reel_status status "processing|published|hidden|removed"
    moderation_status moderation_status
    int like_count "denormalized"
    int comment_count
    int save_count
    int view_count
    double score "feed ranking, recomputed"
    timestamptz deleted_at "SD"
  }
  reel_likes {
    uuid reel_id PK, FK
    uuid user_id PK, FK
    timestamptz created_at
  }
  reel_comments {
    uuid id PK
    uuid reel_id FK
    uuid user_id FK
    uuid parent_id FK
    text body
    moderation_status moderation_status
    timestamptz deleted_at "SD"
  }
  reel_saves {
    uuid reel_id PK, FK
    uuid user_id PK, FK
    timestamptz created_at
  }
  follows {
    uuid follower_id PK, FK
    uuid followee_id PK, FK
    timestamptz created_at
  }
  reports {
    uuid id PK
    uuid reporter_id FK "null = AI auto-flag"
    report_target target_type "reel|comment|review|user|vendor"
    uuid target_id
    text reason_code
    text details
    jsonb ai_scores
    report_status status "open|actioned|dismissed"
  }
  moderation_actions {
    uuid id PK
    uuid report_id FK
    report_target target_type
    uuid target_id
    mod_action action "approve|hide|remove|warn_user|suspend_user|restore"
    uuid actor_id FK "admin; null = AI"
    text note
  }
```

## ERD — AI

```mermaid
erDiagram
  knowledge_documents ||--o{ knowledge_chunks : "split into"
  users ||--o{ chat_sessions : opens
  chat_sessions ||--o{ chat_messages : contains
  users ||--o{ itineraries : plans
  itineraries ||--|{ itinerary_days : has
  itinerary_days ||--o{ itinerary_items : has
  temples ||--o{ itinerary_items : "visited in"

  knowledge_documents {
    uuid id PK
    text title
    knowledge_source source_type "upload|url|text|cms"
    text source_ref
    uuid media_id FK
    text lang
    uuid city_id FK
    uuid temple_id FK
    kdoc_status status "draft|pending_approval|approved|indexing|indexed|failed|archived"
    text content_hash "dedupe and re-index"
    uuid uploaded_by FK
    uuid approved_by FK
    timestamptz indexed_at
  }
  knowledge_chunks {
    uuid id PK
    uuid document_id FK
    int chunk_index
    text content
    int token_count
    vector_1536 embedding "vector(1536), HNSW cosine"
    text embedding_model
    uuid city_id "denormalized filter"
    uuid temple_id "denormalized filter"
    text lang
    jsonb metadata "heading path, page"
  }
  chat_sessions {
    uuid id PK
    uuid user_id FK
    text title
    text lang
    uuid city_id FK
    text memory_summary "rolling summary"
    timestamptz last_message_at
  }
  chat_messages {
    uuid id PK
    uuid session_id FK
    chat_role role "user|assistant|tool|system"
    text content
    jsonb citations "chunk ids + titles"
    jsonb tool_calls
    text model
    int input_tokens
    int output_tokens
    int latency_ms
    boolean flagged
  }
  itineraries {
    uuid id PK
    uuid user_id FK
    text title
    date start_date
    smallint days
    int budget_paise
    smallint party_size
    jsonb preferences "pace, accessibility, interests"
    text share_token UK
    itinerary_status status "draft|saved|archived"
    text model
    jsonb raw_llm_output
    timestamptz deleted_at "SD"
  }
  itinerary_days {
    uuid id PK
    uuid itinerary_id FK
    smallint day_index
    date date
    uuid city_id FK
    jsonb notes_i18n
  }
  itinerary_items {
    uuid id PK
    uuid day_id FK
    smallint seq
    itin_item_kind kind "temple|aarti|meal|travel|stay|explore|rest|custom"
    uuid temple_id FK
    uuid aarti_schedule_id FK
    uuid poi_id FK
    uuid explore_item_id FK
    text title
    timestamptz starts_at
    timestamptz ends_at
    int travel_distance_m
    int travel_duration_min
    int est_cost_paise
    text note
  }
```

## ERD — Ops

```mermaid
erDiagram
  users ||--o{ notifications : receives
  notification_templates ||--o{ notifications : renders
  users ||--o{ sos_events : triggers
  users ||--o{ audit_logs : "acts in"

  notifications {
    uuid id PK
    uuid user_id FK
    uuid template_id FK
    notif_channel channel "push|sms|whatsapp|email|in_app"
    text title
    text body
    jsonb data "deep link payload"
    notif_status status "queued|sent|delivered|failed|read"
    text provider_message_id
    text error
    timestamptz scheduled_for
    timestamptz sent_at
    timestamptz read_at
  }
  notification_templates {
    uuid id PK
    text key UK "aarti_reminder, order_confirmed, sos_alert..."
    notif_channel channel
    jsonb title_i18n
    jsonb body_i18n
    text dlt_template_id "MSG91 / TRAI DLT"
    text whatsapp_template_name
    text[] variables
    boolean is_active
  }
  sos_events {
    uuid id PK
    uuid user_id FK
    sos_status status "triggered|dispatched|resolved|cancelled|false_alarm"
    double lat
    double lng
    int accuracy_m
    jsonb location_trail "last N points"
    smallint battery_pct
    text share_token UK
    timestamptz share_expires_at
    jsonb dispatch_result "per contact/channel"
    timestamptz dispatched_at
    timestamptz resolved_at
    uuid handled_by FK "admin"
    text idempotency_key UK
  }
  audit_logs {
    uuid id PK
    uuid actor_id FK
    text actor_role
    text action "vendor.approve, payout.approve, ..."
    text entity_type
    uuid entity_id
    jsonb before
    jsonb after
    text ip
    text request_id
    timestamptz created_at "append-only"
  }
  app_config {
    uuid id PK
    text key UK "feature.reels, banner.home, min_app_version"
    jsonb value
    config_kind kind "feature_flag|banner|setting"
    jsonb targeting "platform, version range, city, percentage"
    boolean is_active
    timestamptz starts_at
    timestamptz ends_at
    uuid updated_by FK
  }
```

Supporting tables not drawn above: `idempotency_keys` (key, scope, user_id,
request_hash, response_status, response_body, expires_at — unique on
`(scope, user_id, key)`) and `ai_usage` (user_id, date, requests, input_tokens,
output_tokens, cost_micros — PK `(user_id, date)`).

---

## Table notes

### Identity
- **users** — one row per human. Mobile users key on `firebase_uid`; portal users key on `email` + `password_hash`. A user can be both (vendor owner who also uses the app). Guests (`is_guest=true`) are upgraded in place when they link a phone/Google/Apple credential — Firebase preserves the uid.
- **roles / user_roles** — five roles seeded. Vendor roles carry a `vendor_id` scope; the JWT includes `roles[]` and `vendorIds[]`. Fine-grained vendor staff permissions are in `vendor_staff.permissions`.
- **refresh_tokens** — only sha256 hashes stored. `family_id` enables reuse detection: presenting a used token revokes the whole family.
- **devices** — FCM token is unique; re-registering moves it to the current user (shared phones).

### Catalog
- **aarti_schedules** store *local wall-clock* time plus an RRULE and validity window because temple timings change with season (summer/winter) and festivals. `CatalogService.getAartiInstances(templeId, dateRange)` expands them into UTC instants. This is the single source the AI module is allowed to quote.
- **temples.search_vector** — generated `tsvector` from `name_i18n` + tags (`simple` config so Hindi tokens survive) with a GIN index; plus `gin_trgm_ops` index on `name_i18n->>'en'` and `->>'hi'` for fuzzy/typo search.
- **pois** — the safety directory is `pois WHERE is_emergency = true`; cached offline on mobile.
- **media_assets** — every uploaded file. Clients request a presigned PUT (`files` module) which creates a `pending_upload` row; the client confirms, the worker validates (mime sniff, size), produces variants, and flips to `ready`.

### Vendors & inventory
- **vendors.status** workflow: `draft → kyc_pending → (kyc_rejected ↔ kyc_pending) → active ↔ suspended`. Only `active` vendors' listings are visible.
- **vendor_bank_accounts.account_number_enc** — encrypted at the application layer with a key from env (`DATA_ENCRYPTION_KEY`); only `last4` is ever returned to clients.
- **room_inventory** is date-level: one row per `(room_type, stay_date)`. Booking N nights locks N rows `FOR UPDATE` in ascending date order (deadlock-safe) and decrements `available`; `CHECK (available >= 0)` is the last line of defence against overbooking. Rows are materialized 365 days ahead by a nightly job and on room-type creation.
- **cab_fares** — fare estimate = `max(min_fare, base + per_km·km + per_min·min) × (1 + night_surcharge)` computed in integer paise with banker's rounding at the end; distance/duration from `MapsProvider`.
- **experience_slots** — `booked <= capacity` enforced with a check constraint and row lock, mirroring room inventory.

### Orders
- **orders.details** snapshots everything needed to display the order without joining mutable catalog data (hotel name, address, room name, pickup/drop, menu names).
- **orders.idempotency_key** + `idempotency_keys` table: the create endpoint returns the original order for a repeated key.
- **order_status_history** is append-only and is the audit trail for disputes.

### Payments
- **payment_events.provider_event_id UNIQUE** makes the webhook handler idempotent: insert-or-ignore, and only the inserting request processes the event. Signature-invalid events are stored with `signature_valid=false` and not processed.
- **commission_rules** resolution: most specific active rule wins (vendor > city+type > type > global), tie-broken by `priority`. The resolved rule id and amount are snapshotted onto the order at confirmation so later rule edits don't change history.
- **ledger_entries** — append-only, double-entry; each `txn_id` group must balance (sum debits = sum credits), enforced by a deferred constraint trigger. Vendor balance = Σ(credit − debit) on `vendor_payable` for that vendor.
- **payouts** require admin approval (`pending_approval → approved`) before the Route transfer executes.

### Reviews & reels
- **reviews.order_id** unique → one verified review per completed order. Reviews on temples have no order.
- **reels** counters are denormalized and updated by the same transaction as the like/save/comment write (or by a periodic reconciler). `score` is recomputed by a job: recency decay + engagement + locality boost + creator follow graph.
- **reports** with `reporter_id IS NULL` are AI auto-flags from the moderation job.

### AI
- **knowledge_chunks.embedding** — `vector(1536)` with an HNSW index (`vector_cosine_ops`). If the embedding provider's dimension differs, the adapter must project/choose a 1536-dim model; changing dimension requires a migration + re-index (documented in ADR-0003 consequences).
- **chat_sessions.memory_summary** — rolling summary updated every N turns by the cheap model to bound context size.
- **itineraries** — the structured result is normalized into days/items so users can edit individual items; `raw_llm_output` is kept for debugging. `share_token` enables a public read-only link.

### Ops
- **notification_templates.dlt_template_id** — TRAI DLT requires pre-registered SMS templates; the SMS adapter refuses to send a template without one in production.
- **sos_events** — `location_trail` holds the last ~240 points (2 h at 30 s); older points are discarded. `share_token` is 128-bit random, URL-safe, and expires at resolution + 1 h.
- **audit_logs** — append-only (no UPDATE/DELETE grants for the app role in production).
- **app_config** — feature flags, banners, min app version; read by clients via `GET /v1/config` (cached 60 s).

---

## Indexes worth calling out

| Table | Index |
|---|---|
| temples | GIN(`search_vector`), GIN trigram on names, `(city_id) WHERE deleted_at IS NULL AND is_published` |
| aarti_schedules | `(temple_id, local_time)` |
| pois | `(city_id, category)`, `(lat, lng)` |
| room_inventory | PK `(room_type_id, stay_date)` |
| orders | `(user_id, created_at DESC)`, `(vendor_id, status, created_at DESC)`, partial `(hold_expires_at) WHERE status='pending'` |
| payment_events | UNIQUE `(provider, provider_event_id)` |
| ledger_entries | `(vendor_id, account, created_at)` |
| reels | `(status, score DESC)`, `(user_id, created_at DESC)`, GIN(`hashtags`) |
| knowledge_chunks | HNSW(`embedding vector_cosine_ops`), `(city_id)`, `(temple_id)` |
| notifications | `(user_id, created_at DESC)`, partial `(scheduled_for) WHERE status='queued'` |
| idempotency_keys | UNIQUE `(scope, user_id, key)`, `(expires_at)` |
