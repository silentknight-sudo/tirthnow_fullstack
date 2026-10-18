# ADR-0018: Navy and saffron brand from the final logo

- **Status:** Accepted
- **Date:** 2026-10-18
- **Supersedes:** the brand theme part of ADR-0017

## Context

The client supplied the final Tirth Now logo: a navy temple dome and "T" with a
saffron flag, a saffron winding path ending in a navy location pin, and the
"TirthNow" wordmark in navy and saffron on a warm white background. The website and
app still used the earlier cream, temple brown and antique gold tokens.

## Decision

- One palette for the website (`apps/website/app/globals.css`) and the app
  (`TnColors` in `apps/mobile/lib/core/theme/app_theme.dart`), sampled from the logo:

  | Token | Value | Use |
  |---|---|---|
  | `navy` | `#1C3C6B` | primary: buttons, headings, app bar |
  | `accent` | `#C9692A` | saffron for text and icons on light backgrounds |
  | `saffron` | `#E07A2E` | brighter saffron: highlights, countdown, progress |
  | `accentSoft` | `#E9A15F` | soft saffron on dark backgrounds |
  | `paper` / `paper2` / `card` | `#F7F6F1` / `#EDEAE0` / `#FFFFFF` | backgrounds |
  | `ink` / `muted` | `#14233D` / `#5E6B80` | text |
  | `night` | `#0C1A30` | dark sections (SOS, footer) |

  The old token names `brown`, `gold` and `goldSoft` were renamed to `navy`, `accent`
  and `accentSoft` so the names match the colours.
- Logo assets are cut from the supplied image with a transparent background: the mark
  (`logo.png`), the full logo with wordmark (`logo-full.png` / `logo_full.png`), and
  favicons, Android launcher and splash icons, iOS app icons and PWA icons
  (including maskable ones) on the warm white background.
- The website nav wordmark is set as "Tirth" in navy and "Now" in saffron, like the
  logo. Display headings keep Cormorant Garamond; Hindi keeps Tiro Devanagari.

## Consequences

- SOS stays red (`#B3261E`) on both; it must not take the brand colour.
- When the client supplies vector (SVG) logo files, replace the raster cut-outs; the
  current icons come from a 1408 × 3048 PNG.
