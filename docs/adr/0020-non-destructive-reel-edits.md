# ADR-0020: Non-destructive reel edits

- **Status:** Accepted
- **Date:** 2026-11-04

## Context

Creators want Instagram-style editing: trim, filters, speed, text on the
video and muting the sound. Re-encoding video on the phone needs a native
FFmpeg build (large, licence questions, no web support). Re-encoding on the
server adds a second transcode on top of the video provider's.

## Decision

Store edits as JSON on the reel (`reels.edits`: `trimStartMs`, `trimEndMs`,
`filter`, `speed`, `muted`, `overlays[]`), validated by `ReelEditsDto`. The
uploaded video is kept as is. The app applies the edits on playback: it loops
within the trim range, sets speed and volume, draws a colour-matrix filter and
places text overlays at fractional positions. Edits can be changed after posting.

## Alternatives considered

- **On-device FFmpeg:** true baked-in output, but adds tens of MB, no web
  support, and LGPL/GPL obligations.
- **Server re-encode with filters:** works for every client, but needs our own
  FFmpeg workers or a provider feature, and doubles transcode cost.

## Consequences

- Edits are instant and reversible, and work on Android, iOS and web.
- Any other client (website, shared links) must apply the same edits, or it
  shows the raw video. Filter names are a fixed list shared with the API.
- The full video is still downloaded even when trimmed. If that matters, add a
  server render step later that bakes `edits` into a new rendition.
- Licensed background music is not included; it needs a music provider.
