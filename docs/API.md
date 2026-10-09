# Tirth Now — API Modules & Endpoints

Base URL: `/v1`. OpenAPI/Swagger UI at `/docs` (JSON at `/docs-json`), which is
the source for `@tirth-now/api-client`.

Legend — **Auth**: `public` (no token), `any` (any authenticated user incl.
guest), `user` (non-guest), `vendor` (`vendor_owner|vendor_staff` scoped to the
vendor), `owner` (`vendor_owner` only), `admin` (`admin|super_admin`), `super`
(`super_admin`). **Idem** = requires `Idempotency-Key` header.

Auth endpoints share a stricter rate-limit bucket (`THROTTLE_AUTH_PER_MIN`,
default 10/min per IP) on top of the default bucket (`THROTTLE_DEFAULT_PER_MIN`).

Pagination: cursor-based, `?cursor=&limit=` (max 50) → `{ data, nextCursor }`.
Errors: `{ error: { code, message, details?, requestId } }`.

---

Implemented so far (Phase 1) are marked ✅.

## identity

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/firebase` ✅ | public | Exchange Firebase ID token → access + refresh + `deviceId`. Optional `device { deviceId?, platform, fcmToken?, appVersion?, locale? }`. Links an existing account by verified phone/email; upgrades guests in place. |
| POST | `/auth/portal/login` ✅ | public | Email + password. Returns tokens, or `{ otpRequired, challengeId, channel, expiresAt }` when the user has MFA on. |
| POST | `/auth/portal/otp/verify` ✅ | public | 6-digit code (email in Phase 1, SMS from Phase 2). Single use, locks after 5 wrong codes, expires in 5 min. |
| POST | `/auth/portal/password/forgot` ✅ | public | Always 202. Emails a 30-minute link to the vendor or admin portal. |
| POST | `/auth/portal/password/reset` ✅ | public | Single-use token; revokes every session. 204. |
| POST | `/auth/refresh` ✅ | public | Rotating refresh; reuse of an old token revokes the whole session family (`AUTH_REFRESH_REUSED`). Clients must serialise refresh calls. |
| POST | `/auth/logout` ✅ | any | Revokes the current session; body `{ allSessions: true }` revokes all. 204. |
| GET | `/me` ✅ | any | User + roles + vendor ids. |
| PATCH | `/me/profile` | any | Name, language, accessibility, home city. |
| DELETE | `/me` | user | Account deletion request (store compliance). |
| POST | `/me/devices` | any | Register/refresh FCM token. |
| DELETE | `/me/devices/:id` | any | |
| GET/POST/PATCH/DELETE | `/me/emergency-contacts[/:id]` | user | Max 5. |
| GET | `/me/saved` | any | Saved temples, explore items, reels. |

## catalog

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/cities` | public | |
| GET | `/temples` | public | Filters: `city`, `tag`, `near=lat,lng`, `openNow`. |
| GET | `/temples/:idOrSlug` | public | Includes today's aarti instances. |
| GET | `/temples/:id/aarti` | public | `?from=&to=` → expanded instances (UTC + IST display). |
| GET | `/aarti/upcoming` | public | Next N aartis across a city — home card. |
| GET | `/festivals` | public | `?city=&from=&to=` |
| GET | `/pois` | public | `?city=&category=&near=&emergency=true` |
| GET | `/safety/directory` | public | Emergency POIs + helplines (offline-cacheable, ETag). |
| GET | `/explore` | public | `?city=&kind=` |
| GET | `/explore/:id` | public | |
| GET | `/parikrama-routes[/:slug]` | public | |
| GET | `/search` | public | Global: temples, explore, hotels, restaurants, experiences. Full-text + trigram. |
| GET | `/home` | any | Aggregated home feed: time-of-day sections, weather, crowd, next aarti, banners. |
| GET | `/config` | public | Feature flags, banners, min app version. |

## files

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/files/presign` | any | `{ kind, mimeType, sizeBytes, purpose }` → `{ mediaId, uploadUrl, headers, expiresAt }`. |
| POST | `/files/:mediaId/complete` | any | Confirms upload → processing job. |
| GET | `/files/:mediaId` | any | Status + variant URLs. |

## vendors

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/vendors` | user | Start onboarding (creates draft vendor, grants `vendor_owner`). |
| GET | `/vendors/me` | vendor | Vendors the caller belongs to. |
| PATCH | `/vendors/:id` | owner | Business details. |
| POST | `/vendors/:id/kyc-documents` | owner | Attach uploaded media as KYC doc. |
| POST | `/vendors/:id/submit` | owner | `draft → kyc_pending`. |
| GET/POST/PATCH/DELETE | `/vendors/:id/staff[/:staffId]` | owner | Invite by email/phone, set permissions. |
| GET/POST/PATCH | `/vendors/:id/bank-accounts[/:accId]` | owner | Creates Razorpay linked account on verify. |
| GET | `/vendors/:id/dashboard` | vendor | KPIs. |
| GET | `/vendors/:id/earnings` | vendor | Ledger summary, commissions. |
| GET | `/vendors/:id/payouts[/:payoutId/invoice]` | vendor | PDF invoice download. |
| GET | `/vendors/:id/reviews` | vendor | |
| POST | `/vendors/:id/reviews/:reviewId/reply` | vendor | |
| GET/POST | `/vendors/:id/support-tickets` | vendor | |

## inventory

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/hotels` | public | `?city=&checkIn=&checkOut=&guests=&near=&priceMax=` → availability + min price. |
| GET | `/hotels/:id` | public | `?checkIn=&checkOut=` → room types with availability. |
| CRUD | `/vendors/:vid/hotels[/:id]` | vendor | |
| CRUD | `/vendors/:vid/hotels/:hid/room-types[/:id]` | vendor | |
| GET/PUT | `/vendors/:vid/room-types/:rtid/inventory` | vendor | Bulk calendar: `{ from, to, price_paise?, total?, stopSell? }`. |
| POST | `/cabs/estimate` | any | `{ pickup, drop, class?, at? }` → fares per class. |
| CRUD | `/vendors/:vid/vehicles[/:id]` | vendor | |
| CRUD | `/vendors/:vid/cab-fares[/:id]` | vendor | |
| GET | `/restaurants` | public | `?city=&veg=&satvik=&near=` |
| GET | `/restaurants/:id` | public | With menu + external links. |
| CRUD | `/vendors/:vid/restaurants[/:id]`, `/vendors/:vid/restaurants/:rid/menu-items[/:id]` | vendor | |
| GET | `/experiences[/:id]` | public | With slots. |
| CRUD | `/vendors/:vid/experiences[/:id]`, `.../slots` | vendor | |

## orders

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/orders` | user, **Idem** | Discriminated body by `type`. Holds inventory, creates payment intent. |
| GET | `/orders` | user | Booking history. |
| GET | `/orders/:id` | user | Includes status history. |
| POST | `/orders/:id/cancel` | user, **Idem** | Applies cancellation policy → refund. |
| GET | `/vendors/:vid/orders` | vendor | `?status=&type=` |
| POST | `/vendors/:vid/orders/:id/accept` | vendor | |
| POST | `/vendors/:vid/orders/:id/reject` | vendor | |
| POST | `/vendors/:vid/orders/:id/start` | vendor | → `in_progress` |
| POST | `/vendors/:vid/orders/:id/complete` | vendor | → `completed` |
| POST | `/vendors/:vid/orders/:id/cancel` | vendor, **Idem** | |
| POST | `/cab-trips/:orderId/location` | vendor (driver) | Driver location ping → realtime. |

## payments

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/payments/verify` | user, **Idem** | Verifies checkout signature. |
| POST | `/payments/webhooks/razorpay` | public (signature) | Idempotent via `payment_events`. |
| POST | `/payments/webhooks/mock` | public (local only) | Mock provider callbacks. |
| GET | `/payments/:id` | user | |

## reviews

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/reviews` | public | `?targetType=&targetId=` |
| POST | `/reviews` | user | Verified via completed order (except temples). Moderated. |
| PATCH/DELETE | `/reviews/:id` | user | Own review. |

## reels

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/reels` | user | `{ videoMediaId, caption, hashtags, cityId?, templeId? }` → transcode job. |
| GET | `/reels/feed` | any | Ranked, cursor-paged. `?city=` |
| GET | `/reels/:id` | any | |
| DELETE | `/reels/:id` | user | Own reel. |
| POST/DELETE | `/reels/:id/like` | user | |
| POST/DELETE | `/reels/:id/save` | user | |
| GET/POST | `/reels/:id/comments` | any / user | |
| DELETE | `/reels/:id/comments/:cid` | user | |
| POST/DELETE | `/users/:id/follow` | user | |
| GET | `/users/:id/reels` | any | Creator profile. |
| POST | `/reports` | user | Report reel/comment/review/user. |
| POST | `/reels/webhooks/video` | public (signature) | Transcode completion from VideoProvider. |

## ai

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/ai/chat/sessions` | any | |
| GET | `/ai/chat/sessions[/:id]` | any | With messages. |
| POST | `/ai/chat/sessions/:id/messages` | any | **SSE** stream: `token`, `citation`, `done`, `error` events. Quota-limited. |
| DELETE | `/ai/chat/sessions/:id` | any | |
| POST | `/ai/itineraries` | user | Generate from `{ startDate, days, budgetPaise, partySize, cities, accessibility, interests }`. |
| GET | `/ai/itineraries[/:id]` | user | |
| PATCH | `/ai/itineraries/:id` | user | Edit days/items. |
| POST | `/ai/itineraries/:id/share` | user | Returns share link. |
| GET | `/ai/itineraries/shared/:token` | public | |
| GET | `/ai/itineraries/:id/pdf` | user | PDF export. |
| POST | `/ai/voice/transcribe` | any | Audio upload → text (STT). |
| POST | `/ai/voice/speak` | any | Text → audio URL (TTS, cached). |
| POST | `/ai/landmark` | any | Image → `{ matches: [{ templeId, confidence }] }`. |
| GET | `/ai/quota` | any | Remaining daily quota. |

## safety

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/safety/sos` | user, **Idem** | Rate limited; always logged. 202. |
| POST | `/safety/sos/:id/location` | user | Trail update. |
| POST | `/safety/sos/:id/cancel` | user | Within countdown/grace window → `cancelled`. |
| POST | `/safety/sos/:id/resolve` | user / admin | |
| GET | `/s/:shareToken` | public | Live location page data (and a minimal HTML page). |

## notifications

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/notifications` | any | Notification centre. |
| POST | `/notifications/:id/read` | any | |
| POST | `/notifications/read-all` | any | |
| GET/PUT | `/notifications/preferences` | any | Aarti reminders per temple, marketing opt-in. |
| POST | `/aarti-reminders` | any | `{ aartiScheduleId, minutesBefore }` |
| DELETE | `/aarti-reminders/:id` | any | |

## weather

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/weather` | public | `?city=` or `?lat=&lng=`. Cached 15 min in Redis. |

## transit

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/transit/stations` | public | `?q=` |
| GET | `/transit/search` | public | `?from=&to=&date=` → trains + deep links (IRCTC/partner). |

## realtime (Socket.IO, namespace `/rt`)

| Direction | Event | Room |
|---|---|---|
| client → server | `subscribe` `{ room }` | authorization checked per room |
| server → client | `aarti.countdown`, `aarti.live` | `aarti:<templeId>` |
| server → client | `order.status`, `cab.location` | `order:<orderId>` |
| server → client | `order.new` | `vendor:<vendorId>` |
| server → client | `sos.new`, `moderation.new`, `kpi.tick` | `admin` |
| server → client | `sos.location` | `sos:<shareToken>` |

## admin (all `admin` unless noted)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/kpis` | `?from=&to=` GMV, orders, active users, SOS, AI usage. |
| GET/PATCH | `/admin/users[/:id]` | Search, suspend, role assignment (`super` for admin roles). |
| GET | `/admin/vendors` | `?status=` |
| GET | `/admin/vendors/:id` | With KYC docs (signed URLs). |
| POST | `/admin/vendors/:id/kyc-documents/:docId/review` | approve / reject + note |
| POST | `/admin/vendors/:id/approve` \| `/suspend` \| `/reinstate` | |
| CRUD | `/admin/cities`, `/admin/temples`, `/admin/temples/:id/aarti`, `/admin/festivals`, `/admin/explore`, `/admin/pois`, `/admin/parikrama-routes` | CMS. |
| CRUD | `/admin/config` | Feature flags, banners. |
| CRUD | `/admin/knowledge-documents` | Upload, approve, `POST …/:id/reindex`. |
| GET | `/admin/moderation/queue` | Reports + AI flags. |
| POST | `/admin/moderation/:reportId/action` | |
| GET | `/admin/orders[/:id]` | |
| POST | `/admin/orders/:id/refund` | **Idem**; full/partial. |
| GET | `/admin/payments[/:id]` | With webhook events. |
| CRUD | `/admin/commission-rules` | |
| GET | `/admin/payouts` | |
| POST | `/admin/payouts/:id/approve` \| `/hold` | **Idem** |
| POST | `/admin/broadcasts` | Push broadcast / emergency alert by city/segment. |
| GET | `/admin/sos` | Live + historical SOS events. |
| CRUD | `/admin/notification-templates` | |
| GET | `/admin/audit-logs` | Filter by actor, entity, action, date. |
| CRUD | `/admin/admins` | `super` only. |

## health

| Method | Path | Auth |
|---|---|---|
| GET | `/healthz` ✅ | public — liveness |
| GET | `/readyz` ✅ | public — Postgres + Redis checks (503 `SERVICE_UNAVAILABLE` with per-dependency status) |

## dev (non-production only)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/dev/outbox` ✅ | public | Messages captured by mock providers. Not registered when `NODE_ENV=production`. |
