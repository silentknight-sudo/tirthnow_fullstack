# ADR-0006: JSONB i18n columns and lat/lng without PostGIS (v1)

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

CMS content must be bilingual (English + Hindi, more later). Geo needs are
modest: "near me" within a small region (Braj ≈ 60 × 60 km), POI lists, and
distance sorting.

## Decision

- Translatable fields are `*_i18n jsonb` shaped `{ "en": "...", "hi": "..." }`
  with `en` required (Zod/class-validator). API returns the requested language
  with `en` fallback (`Accept-Language` or `?lang=`).
- Geo is `lat`/`lng` double columns, a btree index, a bounding-box prefilter and
  a haversine SQL function for ordering. Routing/directions come from
  `MapsProvider`.

## Alternatives considered

- Translation tables per entity: more joins, heavier CMS; JSONB is enough for a
  handful of languages.
- PostGIS: more powerful, but adds an extension to manage and isn't needed for
  a region this small. Revisit if we add polygon queries (geofenced alerts,
  parikrama-route proximity).

## Consequences

- Full-text search indexes are built from expressions over the JSONB fields.
- Adding a language is a data change, not a schema change.
