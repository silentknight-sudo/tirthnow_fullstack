# ADR-0017: Mobile app structure, generated API models and brand theme

- **Status:** Accepted (brand theme superseded by ADR-0018)
- **Date:** 2026-10-18

## Context

Phase 3 builds the Flutter app against the Phase 2 API (184 paths, 163 schemas).
The Phase 0 plan named Riverpod, go_router, Dio, freezed + json_serializable and Hive.
Three questions were open:

1. How to keep Dart models in step with the API without hand-copying 160 schemas.
2. Whether to run `build_runner` (freezed/json_serializable) for models.
3. Which colours the app uses: the Phase 0 README mentioned green/black tokens, but
   the client's logo and the website (built since) are cream, temple brown and gold.

The app must also work with **zero accounts** locally, like the API: no Firebase
project, no Razorpay keys.

## Decision

- **Models are generated from the API's OpenAPI document**, not hand-written:
  - `pnpm --filter @tirth-now/api openapi:export` writes
    `packages/api-client/openapi.json` (builds the Nest module graph without
    connecting to Postgres or Redis);
  - `node apps/mobile/tool/gen_api_models.mjs` turns it into plain immutable Dart
    classes with `fromJson` / `toJson` in `lib/core/api/api_models.dart`.
  Both outputs are committed. CI fails if either is stale.
- **No `build_runner`.** The generator emits plain Dart, so there is no `*.g.dart` or
  `*.freezed.dart`, and `flutter analyze` works straight after `pub get`.
- **State and navigation:** Riverpod 3 (no codegen), go_router with a
  `StatefulShellRoute` (Home, Temples, Book, Guide, Profile) and an SOS route that is
  reachable while signed out.
- **Provider pattern on the client too.** Identity (`MockIdentityProvider` minting
  the API's `mock:<uid>:<phone>` tokens, `FirebaseIdentityProvider`) and payment
  checkout (`MockPaymentCheckout` backed by the API's dev checkout, `RazorpayCheckout`)
  are interfaces chosen by `--dart-define=AUTH_PROVIDER|PAYMENT_PROVIDER`.
- **Networking:** one `ApiClient` adds `/v1`, `Accept-Language`, the bearer token and
  `Idempotency-Key` (orders, payment verification, cancellation, SOS). A 401 triggers a
  single shared refresh, because refresh tokens rotate and a second concurrent refresh
  would trip reuse detection (ADR-0002).
- **Offline:** catalog reads (temples, aarti, festivals, weather, safety directory)
  fall back to a Hive cache when the network is down.
- **Brand theme:** cream paper `#F6EEDD`, temple brown `#6B3F1F`, antique gold
  `#B8862F`, saffron `#D9772B`, the same tokens as the website. Headings use Cormorant
  Garamond; Hindi falls back to Tiro Devanagari Hindi. Both fonts (SIL OFL) are
  bundled so they work offline and on web.

## Alternatives considered

- **freezed + json_serializable, hand-written per schema.** Rejected: 160 schemas to
  keep in sync by hand, plus a `build_runner` step before every analyze and test.
- **openapi-generator (Java) Dart client.** Rejected: adds a JVM to the toolchain and
  generates a large client we would wrap anyway; we only need the models.
- **Green/black theme from Phase 0.** Rejected: the logo and website use cream and
  brown; one brand across web and app.

## Consequences

- After an API change: run `openapi:export`, then the generator, then fix compile
  errors. CI enforces both steps.
- Some list endpoints return cursor pages (`{ data, nextCursor }`); `asJsonList` accepts
  both shapes. `GET /v1/orders` was documented as an array and is now documented as
  `OrderPageResponse`.
- Store builds still need the Firebase and Razorpay files listed in
  `docs/CLIENT_SETUP_TODO.md`; until then the app runs on mocks.
