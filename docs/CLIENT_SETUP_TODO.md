# Client setup TODO — accounts and keys needed for production

Everything runs locally on mocks. These are required before staging/production.
Lead times matter: start the slow ones (★) early.

| # | Item | Needed for | Env / artefact | Notes |
|---|---|---|---|---|
| 1 | Firebase project (Auth: phone, Google, Apple, anonymous; FCM; Crashlytics) | Mobile login, push | `FIREBASE_*`, `google-services.json`, `GoogleService-Info.plist` | Enable App Check for phone auth abuse protection. |
| 2 | Apple Developer account + Sign in with Apple key | iOS release, Apple login | Codemagic signing | ★ Org enrolment needs D-U-N-S number. |
| 3 | Google Play Console | Android release | Upload keystore | |
| 4 | ★ Razorpay account + KYC, **Route** enabled, webhook secret | Payments, vendor payouts | `RAZORPAY_*` | Route activation needs a separate request to Razorpay. |
| 5 | ★ MSG91 account + **TRAI DLT** entity & template registration | SMS (SOS, OTP fallback, booking) | `MSG91_*`, template ids in `notification_templates` | DLT approval can take 1–3 weeks. |
| 6 | ★ WhatsApp Business (Meta) verification + message templates | SOS + booking messages | `WHATSAPP_*` | Stays mocked until approved. |
| 7 | Google Cloud project: Maps (Directions, Places, Distance Matrix, Maps SDK Android/iOS), Speech-to-Text, Text-to-Speech, Vision, Translate | Maps, voice, landmark, translation | `GOOGLE_MAPS_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Separate restricted keys for server, Android, iOS, web. |
| 8 | Anthropic (Claude) API key | AI guide, planner, moderation | `ANTHROPIC_API_KEY`, `LLM_MODEL_*` | |
| 9 | Embeddings provider key (OpenAI or Voyage) | RAG | `OPENAI_API_KEY` / `VOYAGE_API_KEY` | Must yield 1536-dim vectors (ADR-0003). |
| 10 | Cloudflare account: R2 buckets (public + private), Stream (or Mux) | Media, reels | `S3_*`, `CF_STREAM_*` / `MUX_*` | |
| 11 | OpenWeather API key | Weather | `OPENWEATHER_API_KEY` | |
| 12 | Transit partner (train search API) | Transit | TBD | Mock + IRCTC deep links until chosen. |
| 13 | Sentry org + projects (api, vendor-portal, admin-portal, mobile) | Error tracking | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | |
| 14 | Codemagic account linked to repo | Store builds | `codemagic.yaml` | |
| 15 | Production hosting target (API, worker, Postgres 16 with pgvector, Redis) | Deploy | Deploy workflow secrets | Choose in Phase 6. |
| 16 | Transactional email provider (SES / Postmark) + domain DNS (SPF, DKIM) | Portal emails | `SMTP_*` | |
| 17 | Legal: privacy policy, terms, refund/cancellation policy, Data Protection (DPDP Act 2023) notices | Store listings, payments | URLs in `app_config` | |
