# Tirth Now — API Modules & Endpoints

Base URL: `/v1` (except `/healthz`, `/readyz` and SOS share links `/s/:token`).
OpenAPI/Swagger UI at `/docs` (JSON at `/docs-json`), the source for
`@tirth-now/api-client`. This file lists every route as of Phase 2 (227).

Legend — **Auth**: `public` (no token), `any` (any authenticated user incl.
guest), `user` (non-guest), `vendor[:perm]` (member of the vendor in the path with
that permission: `listings.edit`, `inventory.edit`, `orders.manage`, `finance.view`,
`reviews.reply`), `owner` (vendor owner), `admin` (`admin|super_admin`), `super`
(`super_admin`). **Idem** = requires `Idempotency-Key` (8–128 chars); replays return
the stored response, a different body with the same key is 422, a concurrent duplicate 409.

Rate limits: default bucket `THROTTLE_DEFAULT_PER_MIN`; auth routes `THROTTLE_AUTH_PER_MIN`;
SOS `SOS_MAX_PER_10_MIN` per user; AI `AI_DAILY_QUOTA_USER` / `AI_DAILY_QUOTA_GUEST` per IST day.

Pagination: cursor-based, `?cursor=&limit=` (max 50) → `{ data, nextCursor }`.
Errors: `{ error: { code, message, details?, requestId } }`; codes in `@tirth-now/shared-types`.
Money: integer paise (`*Paise`). Times: ISO-8601 UTC; `date` fields are IST calendar dates.
Language: `?lang=hi|en` or `Accept-Language`.

Vendor role claims in the access token appear after the next `/auth/refresh` (ADR-0014);
vendor endpoints check membership in the database, so they work immediately.

---

## identity

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/firebase` | public | Firebase ID token → access + refresh + `deviceId`. Optional `device`. Links by verified phone/email; upgrades guests in place. |
| POST | `/auth/portal/login` | public | Email + password; MFA users get `{ otpRequired, challengeId }`. |
| POST | `/auth/portal/otp/verify` | public | 6-digit code, single use, 5 attempts, 5 min. |
| POST | `/auth/portal/password/forgot` | public | Always 202. |
| POST | `/auth/portal/password/reset` | public | Single-use token; revokes every session. |
| POST | `/auth/refresh` | public | Rotating refresh; reuse revokes the family (`AUTH_REFRESH_REUSED`). |
| POST | `/auth/logout` | any | `{ allSessions?: true }`. |
| GET | `/me` | any | User, roles, vendor ids. |
| DELETE | `/me` | user | Account deletion (personal data erased, history kept as `deleted`). |
| GET/PATCH | `/me/profile` | any | Name, language, home city, avatar, accessibility, notification prefs (merged). |
| GET/POST | `/me/devices` | any | Register/refresh FCM token (200, upsert). |
| DELETE | `/me/devices/:id` | any | |
| GET/POST | `/me/emergency-contacts` | any | Max 5. |
| PATCH/DELETE | `/me/emergency-contacts/:id` | any | |

## files

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/files/presign` | any | `{ purpose, mimeType, sizeBytes }` → presigned PUT. Purposes: avatar, review_image, reel_video, reel_thumbnail, landmark_photo, voice_note (anyone); listing_image, menu_image, kyc_document, knowledge_document (staff). |
| POST | `/files/:id/complete` | any | Queues content sniffing + image variants (`media.uploaded` / `media.rejected`). |
| GET | `/files/:id` | any | Status + variant URLs. |

## catalog

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/cities` | public | |
| GET | `/temples` | public | `?city=&tag=&lat=&lng=&radiusKm=` |
| GET | `/temples/:idOrSlug` | public | With today's aarti and the next one. |
| GET | `/temples/:id/aarti` | public | `?from=&to=` expanded instances. |
| GET | `/aarti/upcoming` | public | Next aartis across a city. |
| GET | `/festivals` | public | `?city=&from=&to=` |
| GET | `/pois` | public | `?city=&category=&emergency=&lat=&lng=` |
| GET | `/safety/directory` | public | Emergency POIs + helplines (ETag, offline cache). |
| GET | `/explore`, `/explore/:id` | public | |
| GET | `/parikrama-routes`, `/parikrama-routes/:slug` | public | |
| GET | `/search` | public | Temples, explore and listings (trigram). |
| GET | `/config` | public | Active flags/banners/settings, `?platform=&city=` targeting. |
| POST/PATCH | `/admin/cities[/:id]` | admin | |
| POST/PATCH/DELETE | `/admin/temples[/:id]` | admin | |
| GET/POST | `/admin/temples/:id/aarti` | admin | Emits `catalog.aarti_changed` (realtime countdown push). |
| PATCH/DELETE | `/admin/aarti/:id` | admin | |
| POST/PATCH/DELETE | `/admin/festivals[/:id]`, `/admin/pois[/:id]`, `/admin/explore[/:id]` | admin | |
| PUT | `/admin/parikrama-routes/:slug` | admin | Route + ordered stops. |

## vendors

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/vendors` | user | Draft vendor; caller becomes owner. |
| GET | `/vendors/me` | any | Vendors the caller belongs to, with permissions. |
| GET/PATCH | `/vendors/:vid` | vendor / owner | |
| POST | `/vendors/:vid/kyc-documents` | owner | Attach an uploaded `kyc_document`. |
| DELETE | `/vendors/:vid/kyc-documents/:docId` | owner | |
| POST | `/vendors/:vid/submit` | owner | `draft → kyc_pending`. |
| GET/POST | `/vendors/:vid/staff` | owner | Invite existing users by email/phone with permissions. |
| PATCH/DELETE | `/vendors/:vid/staff/:staffId` | owner | |
| GET/POST | `/vendors/:vid/bank-accounts` | owner | Encrypted at rest; masked in responses. |
| POST | `/vendors/:vid/bank-accounts/:accountId/primary` | owner | |
| GET | `/admin/vendors[/:id]` | admin | `?status=`; detail with KYC documents (signed URLs). |
| POST | `/admin/vendors/:id/kyc-documents/:docId/review` | admin | approve / reject + note. |
| POST | `/admin/vendors/:id/approve` \| `/reject` \| `/suspend` \| `/reinstate` | admin | Emits `vendor.*` (notifications). |

## inventory

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/hotels`, `/hotels/:id` | public | `?city=&checkIn=&checkOut=&guests=` availability + prices. |
| POST | `/cabs/estimate` | public | Fares per class (metered or fixed route, night surcharge). |
| GET | `/restaurants`, `/restaurants/:id` | public | Open-now, menu. |
| GET | `/experiences`, `/experiences/:id` | public | With slots. |
| GET/POST | `/vendors/:vid/hotels` | vendor:listings.edit | |
| PATCH/DELETE | `/vendors/:vid/hotels/:id` | vendor:listings.edit | |
| POST | `/vendors/:vid/hotels/:id/room-types` | vendor:listings.edit | Materialises 365 nights of inventory. |
| PATCH/DELETE | `/vendors/:vid/room-types/:rtid` | vendor:listings.edit | |
| GET/PUT | `/vendors/:vid/room-types/:rtid/inventory` | vendor:inventory.edit | Calendar: price, total, stop-sell per range. |
| GET/POST, PATCH/DELETE | `/vendors/:vid/vehicles[/:id]` | vendor:listings.edit | |
| GET | `/vendors/:vid/cab-fares`; PUT `/vendors/:vid/cab-fares/:class` | vendor:listings.edit | |
| GET/POST, PATCH/DELETE | `/vendors/:vid/restaurants[/:id]` | vendor:listings.edit | |
| POST | `/vendors/:vid/restaurants/:id/menu-items`; PATCH/DELETE `/vendors/:vid/menu-items/:id` | vendor:listings.edit | |
| GET/POST, PATCH/DELETE | `/vendors/:vid/experiences[/:id]` | vendor:listings.edit | |
| POST | `/vendors/:vid/experiences/:id/slots`; DELETE `/vendors/:vid/experience-slots/:slotId` | vendor:inventory.edit | |

## orders

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/orders` | user, **Idem** | `type` = hotel \| cab \| food \| experience. Holds inventory for `ORDER_HOLD_MINUTES`, returns `{ order, payment }` (Razorpay order + key id). |
| GET | `/orders`, `/orders/:id` | user | With status history and `refundedPaise`. |
| POST | `/orders/:id/pay` | user | Payment intent again (retry after a failed payment). |
| POST | `/orders/:id/payments/verify` | user, **Idem** | Checkout signature; confirms if the webhook has not yet. |
| GET | `/orders/:id/cancellation` | user | Refund/penalty preview from the listing policy. |
| POST | `/orders/:id/cancel` | user, **Idem** | |
| GET | `/orders/:id/tracking` | user | Cab: last driver position + realtime room. |
| GET | `/vendors/:vid/orders[/:id]` | vendor:orders.manage | Paid orders only. |
| POST | `/vendors/:vid/orders/:id/accept` \| `/start` \| `/complete` | vendor:orders.manage | Accept assigns a cab vehicle/driver. |
| POST | `/vendors/:vid/orders/:id/reject` \| `/cancel` | vendor:orders.manage, **Idem** | Full refund. |
| POST | `/vendors/:vid/orders/:id/location` | vendor:orders.manage | Driver position → `cab.location`. |
| GET | `/admin/orders[/:id]` | admin | |
| POST | `/admin/orders/:id/cancel` | admin, **Idem** | Full refund. |
| POST | `/admin/orders/:id/complete` | admin | |
| POST | `/admin/orders/:id/refund` | admin, **Idem** | Partial refund of in-progress/completed orders. |

## payments

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/payments/webhooks/:provider` | public (signature) | `razorpay` (`X-Razorpay-Signature`) or `mock` (`x-mock-signature`, HMAC of the raw body with `MOCK_PAYMENT_SECRET`). Deduplicated by event id; invalid signatures 401 and are not stored. |
| GET | `/vendors/:vid/earnings` | vendor:finance.view | Pending, payable, available for payout, in flight, paid. |
| GET | `/vendors/:vid/payouts` | vendor:finance.view | |
| GET | `/vendors/:vid/statement?month=YYYY-MM` | vendor:finance.view | PDF statement from the ledger. |
| GET/POST | `/admin/commission-rules`; PATCH `/admin/commission-rules/:id` | admin | Most specific rule wins (vendor > city > type > global). |
| GET | `/admin/payouts` | admin | `?status=&vendorId=` |
| POST | `/admin/payouts/run` | admin | Schedule payouts now (also daily 02:00 IST). |
| POST | `/admin/payouts/:id/approve` | admin, **Idem** | Queues the Route transfer. |
| POST | `/admin/payouts/:id/hold` | admin | |
| POST | `/admin/refunds/:id/retry` | admin, **Idem** | Re-send a refund the gateway rejected. |
| GET | `/admin/payments?orderId=` | admin | With webhook events and refunds. |

## reviews

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/reviews` | public | `?targetType=&targetId=&rating=` → `{ summary, data }` (approved only). |
| GET | `/reviews/mine` | any | |
| POST | `/reviews` | user | Temples: anyone, once. Hotels/restaurants/experiences/vendors: needs the reviewer's completed order for that listing. Auto-moderated. |
| PATCH/DELETE | `/reviews/:id` | owner of review | |
| GET | `/vendors/:vid/reviews` | vendor | `?unanswered=true` |
| POST | `/vendors/:vid/reviews/:id/reply` | vendor:reviews.reply | Notifies the reviewer. |

## reels

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/reels` | user | `{ videoMediaId, thumbnailMediaId?, caption?, hashtags?, cityId?, templeId? }` → `processing`; transcoded after the upload passes verification. |
| GET | `/reels/feed` | any | Hot-score ranking; `?city=&templeId=&hashtag=&following=true&cursor=&limit=` (max 30). |
| GET | `/reels/saved` | any | |
| GET/DELETE | `/reels/:id` | any / creator | |
| POST/DELETE | `/reels/:id/like`, `/reels/:id/save` | user | Idempotent toggles. |
| POST | `/reels/:id/view` | any | Counted once per viewer per 6 h. |
| GET/POST | `/reels/:id/comments` | any / user | One level of replies (`parentId`); auto-moderated. |
| DELETE | `/reels/:id/comments/:cid` | author or reel creator | |
| GET | `/users/:id/reels` | any | Creator profile + reels. |
| POST/DELETE | `/users/:id/follow` | user | |
| POST | `/reports` | user | Reel, comment, review, user or vendor; 3 distinct reports hide content pending review. |
| POST | `/reels/webhooks/video` | public (signature) | Cloudflare Stream (`Webhook-Signature`), Mux (`mux-signature`) or mock (`x-mock-signature`, `MOCK_VIDEO_SECRET`). |
| GET | `/admin/moderation/queue` | admin | `?status=&targetType=` with target previews and AI scores. |
| POST | `/admin/moderation/:reportId/action` | admin | approve \| hide \| remove \| restore \| warn_user \| suspend_user; closes all open reports on the target. |

## ai

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/ai/chat/sessions` | any | `{ city?, lang? }` |
| GET | `/ai/chat/sessions[/:id]` | any | Detail includes messages with citations. |
| DELETE | `/ai/chat/sessions/:id` | any | |
| POST | `/ai/chat/sessions/:id/messages` | any | **SSE** (`text/event-stream`): `token {text}`, `citation {n, documentId, title, sourceRef}`, `done {messageId, model, remainingQuota}`, `error {code, message}`. Quota/not-found errors are plain JSON before the stream opens. |
| GET | `/ai/quota` | any | `{ limit, used, remaining, resetsOn }` |
| POST | `/ai/itineraries` | user | `{ startDate, days (1–7), partySize?, budgetPaise?, cities?, interests?, accessibility?, pace?, lang? }` → saved plan; aarti times from temple schedules. |
| GET | `/ai/itineraries[/:id]` | user | |
| PATCH | `/ai/itineraries/:id` | user | `{ title?, status?, removeItemIds? }` |
| DELETE | `/ai/itineraries/:id` | user | |
| POST | `/ai/itineraries/:id/share` | user | Share link. |
| GET | `/ai/itineraries/shared/:token` | public | Budget hidden. |
| GET | `/ai/itineraries/:id/pdf` | user | |
| POST | `/ai/voice/transcribe` | any | `{ mediaId }` (voice_note) → `{ text, lang }` |
| POST | `/ai/voice/speak` | any | `{ text, lang? }` → MP3 URL (cached by text). |
| POST | `/ai/landmark` | any | `{ mediaId, lat?, lng? }` (landmark_photo) → top temple matches. |
| GET/POST | `/admin/knowledge-documents` | admin | Text or upload (markdown, text, PDF); `pending_approval` until approved. |
| POST | `/admin/knowledge-documents/sync-catalog` | admin | Temple pages → approved CMS documents. |
| POST | `/admin/knowledge-documents/:id/approve` \| `/reindex` \| `/archive` | admin | |

## safety

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/safety/sos` | any, **Idem** | `{ lat, lng, accuracyM?, batteryPct? }` → 202 with share URL, nearest police/hospital, helplines. An active SOS is returned instead of a new one; over the limit → 429 `SOS_RATE_LIMITED` (still audited). |
| GET | `/safety/sos/:id` | owner | |
| POST | `/safety/sos/:id/location` | owner | Every ~15 s while active. |
| POST | `/safety/sos/:id/cancel` | owner | Within 2 minutes. |
| POST | `/safety/sos/:id/resolve` | owner | Contacts are told the traveller is safe. |
| GET | `/s/:shareToken` | public | Live location JSON, or a self-refreshing HTML page for browsers; location hidden once ended. |
| GET | `/admin/sos[/:id]` | admin | `?status=&active=true`; detail with trail, contacts, dispatch result. |
| POST | `/admin/sos/:id/resolve` | admin | `{ note?, falseAlarm? }` |

## notifications

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/notifications` | any | In-app centre `?unreadOnly=` → `{ data, nextCursor, unreadCount }`. |
| POST | `/notifications/:id/read`, `/notifications/read-all` | any | |
| GET/PUT | `/notifications/preferences` | any | `aartiReminders`, `bookingUpdates`, `marketing`, `defaultReminderMinutes`. |
| GET/POST | `/aarti-reminders` | any | `{ aartiScheduleId, minutesBefore? }` (upsert, max 30) with next reminder time. |
| DELETE | `/aarti-reminders/:id` | any | |
| GET/PUT | `/admin/notification-templates` | admin | Built-ins + overrides (text, DLT template id, WhatsApp template name). |
| DELETE | `/admin/notification-templates/:id` | admin | Deactivates the override. |

## weather & transit

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/weather` | public | `?city=` or `?lat=&lng=` → now, 5-day forecast, advisories (heat, cold, rain, fog, storm). Cached `WEATHER_CACHE_SECONDS`. |
| GET | `/transit/stations` | public | `?q=` |
| GET | `/transit/search` | public | `?from=NDLS&to=MTJ&date=` → trains + IRCTC deep links (indicative timings, ADR-0012). |

## admin (orchestration)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/admin/kpis` | admin | `?from=&to=` (IST dates, ≤ 1 year): users, orders/GMV by type, revenue/GST/refunds, vendors, SOS, reels, AI usage. |
| GET | `/admin/users` | admin | `?q=&role=&status=` |
| PATCH | `/admin/users/:id/status` | admin | `{ status, reason }`; suspension revokes sessions. Admin accounts: super only. |
| POST | `/admin/users/:id/roles`; DELETE `/admin/users/:id/roles/:role` | super | admin / super_admin; the last super admin stays. |
| GET/PUT | `/admin/config`; DELETE `/admin/config/:key` | admin | Feature flags, banners, settings with targeting and schedule. |
| POST | `/admin/broadcasts` | admin, **Idem** | `{ title, body, city?, emergency? }` → push + in-app, batched. |
| GET | `/admin/audit-logs` | admin | `?entityType=&entityId=&actorId=&actionPrefix=` |

## realtime (Socket.IO, namespace `/rt`)

Connect with `auth: { token: <access JWT> }` (or anonymously), then
`emit('subscribe', { room })` → ack `{ ok, room? , error? }` (`INVALID_ROOM`, `FORBIDDEN`).

| Room | Who may join | Server → client events |
|---|---|---|
| `aarti:<templeId>` | anyone | `aarti.countdown {templeId, next}` (on join and on schedule change), `aarti.live` |
| `order:<orderId>` | order owner, vendor staff (orders.manage), admins | `order.status`, `cab.location` |
| `vendor:<vendorId>` | vendor staff (orders.manage) | `order.new`, `order.status` |
| `admin` | admins | `sos.new`, `sos.status`, `sos.location`, `moderation.new` |
| `sos:<shareToken>` | anyone with the link, while active | `sos.location`, `sos.status` |

## health & dev

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/healthz`, `/readyz` | public | Liveness; Postgres + Redis readiness. |
| GET | `/dev/outbox` | public, non-prod | Email, push, SMS and WhatsApp captured by mock providers. |
| PUT/GET | `/dev/storage/:bucket/*key` | signed, non-prod | Mock storage. |
| POST | `/dev/payments/checkout` | public, non-prod | Simulate Razorpay checkout (+ webhook) for an order. |

## Planned (not built yet)

`GET /home` (aggregated home feed — the app composes it from the endpoints above in
Phase 3), `GET /me/saved`, vendor dashboard KPIs and support tickets (ADR-0016).
