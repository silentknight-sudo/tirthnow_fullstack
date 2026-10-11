# ADR-0012: Train discovery with booking deep links (mock provider for now)

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Pilgrims arrive by train (Mathura Junction, Vrindavan). Booking Indian Railways
tickets requires IRCTC authorisation or a licensed partner; live timetable APIs are
commercial and the partner has not been chosen.

## Decision

- `TransitProvider` exposes station search and train search only. The app shows
  trains and hands off to IRCTC (or a partner) through `bookingUrl` deep links.
- Only a mock adapter exists today: a small static timetable around Braj with running
  days and overnight arrivals. `TRANSIT_PROVIDER` accepts only `mock`; a real value is
  added with its adapter once a data partner is contracted
  (`docs/CLIENT_SETUP_TODO.md`).
- Responses carry a disclaimer that timings are indicative.

## Alternatives considered

- Scraping public timetable sites: brittle and against terms of service.
- Booking inside the app: needs IRCTC agent licensing; out of scope for v1.

## Consequences

- No ticket orders exist in `orders` for transit yet; ADR-0004 leaves room for them.
- When a partner is chosen: add `<partner>.adapter.ts`, the enum value, env vars and
  credentials checks, as for every provider (ADR-0003).
