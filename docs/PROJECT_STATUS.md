# Tirth Now — Project status

_Updated 6 November 2026 · branch `claude/peaceful-fermi-hvmzt4`_

Tirth Now is a pilgrimage companion for Braj (Mathura, Vrindavan, Govardhan,
Barsana, Gokul, Nandgaon): temples and live aarti times, stays, food, cabs,
an AI guide and trip planner, SOS safety, and devotional reels.

## At a glance

| Part | Status |
|---|---|
| Phase 0 — Architecture, data model, decision records | ✅ Done |
| Phase 1 — Foundation (monorepo, database, login, CI) | ✅ Done |
| Phase 2 — Backend API (16 modules, ~230 endpoints, realtime, workers) | ✅ Done |
| Phase 3 — Mobile app (Flutter, Android/iOS) | ✅ Done, polished |
| Phase 4 — Vendor / partner portal | ✅ Done |
| Marketing website | ✅ Done |
| Demo hosting (Render) | ✅ Set up, start-up fix pushed (needs a redeploy) |
| Phase 5 — Admin portal | ⏳ Not started |
| Phase 6 — Hardening and store release | ⏳ Not started |
| Real third-party accounts (payments, SMS, maps, AI…) | ⏳ Waiting on client (all run on safe mocks today) |

## What has been built

### Backend API (NestJS + PostgreSQL + Redis)
- **Login and accounts:** phone OTP, guest mode, roles (pilgrim, vendor owner/staff, admin), secure token refresh.
- **Temples and aarti:** 30 temples in 6 cities, 132 aarti schedules, live crowd level, festivals. Aarti times always come from the database, never invented.
- **Bookings:** hotels with room inventory, restaurants and food orders, cabs, experiences; one order flow with cancel and refund.
- **Payments:** Razorpay-ready checkout, double-entry ledger, commission + GST, vendor payouts.
- **Vendors:** partner sign-up, KYC documents, listings, staff permissions.
- **Safety (SOS):** one-tap alert, live-location share link, emergency contacts, nearest police/hospital.
- **AI:** Braj Guide chat (with temple knowledge base and voice), photo temple recognition, trip planner.
- **Reels:** upload, video processing, feed ranking, likes, comments with replies, saves, follows, reports and moderation.
- **Notifications:** push, SMS, WhatsApp, email templates in English and Hindi, user preferences.
- **Weather and transit,** realtime updates (Socket.IO), background worker jobs.
- **Quality:** strict TypeScript, input validation everywhere, 15 end-to-end test suites, CI on every push.

### Mobile app (Flutter)
- **Splash and sign-in:** hero banner, login/register tabs, guest mode, Hindi/English switch.
- **Home:** greeting, auto-sliding photo carousel, weather / live crowd / next aarti cards, compact quick-access grid, "Plan a group yatra" card, reels strip, popular temples, festivals.
- **Temples:** list with filters, detail page, aarti timings, reminders, reviews.
- **Bookings:** stays, food, cabs, experiences, checkout and payment, my bookings.
- **AI Guide:** chat, voice questions, photo scan of a temple.
- **Trip planner (new):**
  - Solo, family or group trip; group name and members (name, age, phone, role).
  - Dates, 1–7 days, multiple cities.
  - **AI plan** around real aarti times, or **custom plan** with only your own stops.
  - Stay (pick a TirthNow hotel or your own dharamshala), rooms, price, check-in time.
  - Travel: train/bus/car/flight, from where, arrival/departure, local transport, ticket details.
  - Result screen with summary, group, stay, travel cards and a day-by-day timeline.
  - **Downloadable PDF** with TirthNow branding, watermark, Hindi + English fonts; shareable link (hides members' phone numbers).
- **Reels (Instagram-style):**
  - For you / Following feeds, hashtag pages, creator profiles with follow.
  - Double-tap like, comments with replies, save, share, report, mute, progress bar.
  - Create: record or pick a video, **editor** with trim, 8 filters, speed, text overlays, sound; cover, caption, hashtags, temple tag; edit or delete later.
  - Demo creator **@adiyogi** with 4 Hindi reels (Canva visuals, Hindi voice-over, original music).
- **SOS, notifications, profile,** emergency contacts.
- All text in English and Hindi; navy and saffron theme.

### Vendor portal (Next.js)
Partner sign-up and KYC, listings (hotels, rooms, menus, vehicles, experiences), inventory and prices, orders, payouts, staff and permissions. Tested with Playwright.

### Website and documents
Marketing website; architecture, data model, API, integrations and deployment guides; 20 decision records (ADRs); client setup checklist.

## Recent fixes
- Reels did not play on phones: video links pointed at `localhost`. Now built from the server's public address (works on Render automatically).
- Render deploy timed out: the start command now opens the port immediately and seeds demo data in the background.
- WebM videos (common on Android) were rejected on upload; now accepted.
- Planner no longer schedules visits before you arrive or after you leave.
- Selected filter chips were unreadable (dark on navy); now white text.

## What is left

### 1. Your action now
- **Redeploy on Render** (Manual Deploy → latest commit). If the service was not created from the Blueprint, update its Start Command as in `docs/DEPLOY_RENDER.md`.
- Install the latest APK from the `mobile-apk` GitHub workflow and confirm reels play.

### 2. Accounts and keys needed from the client
Full list with how-to in `docs/CLIENT_SETUP_TODO.md`. Most important:
- **Firebase** (real phone login, push notifications).
- **Razorpay** with KYC and Route (real payments and vendor payouts).
- **MSG91 + DLT templates** and **WhatsApp Business** (SOS and booking messages).
- **Google Cloud** keys (maps, voice, photo recognition).
- **Anthropic API key** (real AI guide and planner) and OpenAI key (knowledge search).
- **Cloudflare R2 + Stream** (storing and streaming user-uploaded reels; until then, user uploads on Render are lost on restart).
- OpenWeather, email provider, Sentry, app store accounts, legal pages.
- **Verify every aarti time** in the seed data with the temples.
- **Commercial Hindi voice** for the demo reels (current free voice is non-commercial only).

### 3. Development still to do
- **Phase 5 — Admin portal:** content and temple management, aarti time editor, moderation queue, vendor approval and KYC review, orders, refunds and payouts, reports.
- **Phase 6 — Hardening and release:**
  - Switch every mock to the real provider once keys arrive, and test end to end.
  - Run the background worker on hosting (reel processing, reminders, payouts).
  - Production hosting (API, worker, Postgres with pgvector, Redis), backups, monitoring.
  - Security review, load test, privacy (DPDP) notices.
  - App icons, store listings (en + hi), signed builds, Play Store and App Store submission.
- **Nice to have:** licensed background music for reels, baked-in video edits for sharing outside the app, follower/following lists, offline trip plans.

## Where things are
| Area | Path |
|---|---|
| API | `apps/api` |
| Mobile app | `apps/mobile` |
| Vendor portal | `apps/vendor-portal` |
| Website | `apps/website` |
| Docs and ADRs | `docs/`, `docs/adr/` |
| Client checklist | `docs/CLIENT_SETUP_TODO.md` |
| Render guide | `docs/DEPLOY_RENDER.md` |
