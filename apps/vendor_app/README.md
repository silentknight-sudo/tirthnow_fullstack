# TirthNow Partner (vendor app)

Flutter app for service providers: cabs (bike / auto / car), hotels, dharamshalas,
restaurants and Temple Store sellers.

Flow: phone OTP → choose service → business details → KYC documents + payout bank →
waiting for approval (or straight to the dashboard while `VENDOR_AUTO_APPROVE=true`) →
dashboard, orders, listings, coupons, reviews.

```
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000   # mock OTP 123456
flutter analyze && flutter test
```

API models are generated together with the customer app's
(`cd apps/mobile && node tool/gen_api_models.mjs`). See ADR-0021.
