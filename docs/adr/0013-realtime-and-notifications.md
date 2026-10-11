# ADR-0013: Realtime fan-out and notification delivery

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Order status, cab location, SOS updates and aarti countdowns must reach clients in
real time, from both API replicas and the worker (which handles webhooks, SOS
dispatch and schedulers). Notifications go out over push, SMS, WhatsApp, email and an
in-app centre, with user preferences and retries.

## Decision

**Realtime**
- Socket.IO namespace `/rt` with the Redis adapter on API processes. Every emit goes
  through `@socket.io/redis-emitter` (`RealtimePublisher`), so worker and API code
  publish the same way; the worker runs no socket server (no gateway provider when
  `PROCESS_ROLE=worker`).
- Modules never import realtime: it listens to domain events (`order.*`,
  `cab.location_updated`, `sos.*`, `catalog.aarti_changed`) and maps them to rooms.
- Clients authenticate in the handshake (`auth.token`); anonymous sockets are allowed
  but may only join `aarti:<templeId>` and active `sos:<shareToken>` rooms. Every
  `subscribe` is authorised against the database (order owner, vendor staff with
  `orders.manage`, admins).
- Redis channel keys include the Redis DB index so local stacks and tests never
  cross-talk.

**Notifications**
- One `notifications` row per user × channel. In-app rows are delivered by being
  stored; outbound rows are queued one job each (`notif-<id>`, 5 attempts).
- Templates are built into code (en + hi) and can be overridden per key × channel in
  `notification_templates`, which also carries gateway ids (DLT template id, WhatsApp
  template name).
- Preferences (`bookingUpdates`, `aartiReminders`, `marketing`) filter by template
  category; safety and vendor messages always go out.
- Dead FCM tokens are removed when the gateway reports them.
- SOS alerts are delivered inline by the SOS job for speed; anything that fails
  transiently falls back to the notifications queue.
- Aarti reminders live in `aarti_reminders` (owned by notifications); a per-minute
  scheduler claims each occurrence atomically (`last_occurrence_at`).

## Alternatives considered

- Polling: simpler, but SOS and cab tracking need seconds, not minutes.
- A managed pub/sub (Ably, Pusher): another vendor and per-message cost.
- Sending from the event listener directly: a slow gateway would slow user requests.

## Consequences

- Socket clients reconnect with a fresh access token when theirs expires.
- New realtime features add a listener and, if needed, a room kind with an access rule.
