# Tirth Now mobile (Flutter)

Pilgrim app for Android and iOS (also runs on web for quick previews).
Riverpod 3, go_router, Dio, Hive (offline cache), flutter_secure_storage.
Design and decisions: [ADR-0017](../../docs/adr/0017-mobile-app-structure.md).

## Run it locally

Start the API with mocks first (repo root):

```bash
pnpm setup            # once: infra, migrate, seed
pnpm dev              # API on http://localhost:4000
```

Then the app:

```bash
cd apps/mobile
flutter pub get
flutter run                                   # Android emulator → http://10.0.2.2:4000
flutter run -d chrome --web-port 3001         # web preview → http://localhost:4000
```

Sign in with any 10-digit mobile number; in test mode the OTP is **123456**.
Payments open a test checkout (no real money). Use "Continue as guest" to browse.

For web, the API's `CORS_ORIGINS` must include the web origin (the example `.env`
already allows `http://localhost:3001`). Locally, set `STORAGE_PROVIDER=mock` in `.env`
if MinIO is not running (voice and photo uploads need storage).

### Build-time settings (`--dart-define`)

| Name | Default | Purpose |
|---|---|---|
| `API_BASE_URL` | `http://10.0.2.2:4000` (Android), `http://localhost:4000` (others) | API origin, without `/v1` |
| `AUTH_PROVIDER` | `mock` | `firebase` for real phone OTP (needs the Firebase files below) |
| `PAYMENT_PROVIDER` | `mock` | `razorpay` for real checkout |
| `RAZORPAY_KEY_ID` | — | Public Razorpay key id (the API also returns it per payment) |

Nothing secret is compiled into the app.

## Layout

```
lib/
  core/        api client + generated models, config, theme, router, l10n helpers, cache
  features/    auth, home, catalog (temples, aarti), bookings (stays, cabs, food,
               experiences, orders, payments), safety (SOS), notifications, profile,
               reels, ai (guide chat, planner, voice, photo), travel (weather, trains),
               reviews
  l10n/        app_en.arb, app_hi.arb (+ generated app_localizations*.dart)
tool/          gen_api_models.mjs
test/          unit, widget and contract tests
```

## Keep generated code current

```bash
pnpm --filter @tirth-now/api openapi:export   # API → packages/api-client/openapi.json
node apps/mobile/tool/gen_api_models.mjs      # → lib/core/api/api_models.dart
dart format apps/mobile/lib/core/api/api_models.dart
flutter gen-l10n                              # after editing the .arb files
```

CI fails if any of these outputs is stale.

## Checks

```bash
dart format --set-exit-if-changed lib test tool
flutter analyze
flutter test                                   # unit + widget tests
flutter test test/contract --dart-define=API_CONTRACT_URL=http://localhost:4000
```

The contract tests drive the app's repositories against a running API: sign-in,
catalog, a hotel booking paid through the test checkout and then cancelled, SOS,
notifications, reels, and the AI guide's streamed answer and planner.

## Installable APK

The `Mobile APK` workflow (`.github/workflows/mobile-apk.yml`) builds on every push
that touches `apps/mobile` and on demand (Actions → Mobile APK → Run workflow). Download
`tirth-now-apk` from the run: `app-release.apk` installs on any Android phone;
`app-arm64-v8a-release.apk` is smaller for modern phones. It is signed with the debug
key, so it is for testing, not Google Play.

The API address is compiled in: pass `api_base_url` when running the workflow, or set
the repository variable `MOBILE_API_BASE_URL` (e.g. `https://api.example.com`). The
default `http://10.0.2.2:4000` only works in the Android emulator.

## Before store release

See `docs/CLIENT_SETUP_TODO.md`: Firebase project files (`google-services.json`,
`GoogleService-Info.plist`), Razorpay keys, signing, Codemagic.
