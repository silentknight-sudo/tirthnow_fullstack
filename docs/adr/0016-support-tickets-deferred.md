# ADR-0016: Defer vendor support tickets and the home feed endpoint

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The original API sketch listed vendor support tickets, a vendor dashboard endpoint,
`GET /me/saved` and an aggregated `GET /home`. None has a table or a defined workflow,
and the portals and app that would use them are built in Phases 3–5.

## Decision

- No support-ticket tables in Phase 2. Vendors reach the team through the contact
  channels in the portal; admins act through the existing order, payout and vendor
  endpoints, all of which are audited.
- The app composes its home screen from existing endpoints (upcoming aarti, weather,
  festivals, config banners, reels feed); a server-side aggregate is added only if
  measured latency on low-end phones calls for it.
- Saved items exist for reels (`GET /reels/saved`); temples and explore bookmarks are
  added with the app screens that need them.

## Alternatives considered

- Building generic tickets now: speculative schema we would likely reshape once the
  portal flows exist.

## Consequences

- Phase 4/5 adds tickets with a migration and a small module; nothing else changes.
