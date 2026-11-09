# Tirth Now — Project status

_Updated 9 November 2026 · branch `claude/peaceful-fermi-hvmzt4`_

Tirth Now is a spiritual tourism and community app for Braj (Mathura, Vrindavan,
Govardhan, Barsana, Gokul, Nandgaon): temples and aarti, stays, food and cabs,
an AI voice guide and trip planner, family trip tracking, SOS safety, pooja
essentials and devotional reels.

## At a glance

| Part | Status |
|---|---|
| Phase 0 — Architecture, data model, decision records | ✅ Done |
| Phase 1 — Foundation (monorepo, database, login, CI) | ✅ Done |
| Phase 2 — Backend API (17 modules, ~245 endpoints, realtime, workers) | ✅ Done |
| Phase 3 — Mobile app (Flutter, Android/iOS) | ✅ Done, polished |
| Phase 4 — Vendor / partner portal | ✅ Done |
| Client brief (Nov 2026): 11 product improvements | ✅ Done (see below) |
| Marketing website | ✅ Done |
| Demo hosting (Render) | ✅ Set up (redeploy after each push) |
| Phase 5 — Admin portal | ⏳ Not started |
| Phase 6 — Hardening and store release | ⏳ Not started |
| Real third-party accounts (payments, SMS, maps, AI…) | ⏳ Waiting on client (all run on safe stand-ins today) |

## Client brief (November 2026): what was delivered

| # | Requirement | Delivered |
|---|---|---|
| 1 | Remove the weather icon | ✅ Weather card removed from Home. |
| 2 | Crowd section with demo people | ✅ Live Crowd card with sample pilgrim photos, visitor count, crowd level; every sample marked **DEMO**. |
| 3 | Complete aarti content | ✅ Aartis by temple: full Hindi lyrics, temple photo, audio with Play / Pause / Replay / Repeat, seek bar, text size. |
| 4 | Clean icons, fewer boxes | ✅ 5-column quick access with coloured icons in soft circles, serif labels. |
| 5 | Real AI voice | ✅ Tap or hold the mic, Listening / Speaking states, spoken replies, Play / Pause / Stop, hear answers in Hindi or English (translation step). |
| 6 | Trip start / end notifications | ✅ Start and end a trip, notifications with the exact wording, Trip History, family is told too. |
| 7 | Family live location | ✅ Family groups with join codes; each member's consent per group; start / pause / stop sharing; last update time; open in Maps. |
| 8 | WhatsApp sharing | ✅ WhatsApp message with a secure tracking link; link page shows trip and permitted location; WhatsApp group invites. |
| 9 | Pooja Items | ✅ New section, 8 items with photos and descriptions in 4 categories. |
| 10 | Remove QR, add Reels / Create Profile | ✅ Bottom bar: Home · AI Guide · Reels · My Trips · Profile; profile photo and name; People screen. |
| 11 | Distinctive TirthNow look | ✅ Serif headings, navy and saffron, richer home layout (continues in Phase 6 polish). |

## What has been built

### Backend API (NestJS + PostgreSQL + Redis)
- **Login and accounts:** phone OTP, guest mode, roles (pilgrim, vendor owner/staff, admin), secure token refresh, profile with photo.
- **Temples and aarti:** 30 temples in 6 cities, 132 aarti schedules, live crowd level, festivals. Aarti times always come from the database, never invented.
- **Bookings:** hotels with room inventory, restaurants and food orders, cabs, experiences; one order flow with cancel and refund.
- **Payments:** Razorpay-ready checkout, double-entry ledger, commission + GST, vendor payouts.
- **Vendors:** partner sign-up, KYC documents, listings, staff permissions.
- **Safety (SOS):** one-tap alert, live-location share link, emergency contacts, nearest police and hospital.
- **AI:** Braj Guide chat with temple knowledge base, speech-to-text, spoken answers, answer translation, photo temple recognition, trip planner.
- **Trip planner:** solo / family / group trips with members, stay, travel, AI or custom plan; branded PDF with Hindi and English fonts and a TirthNow watermark.
- **Trips (new):** start / end with notifications, trip history, live location stored only while the traveller shares it, tracking link `/t/<token>`, family groups with join codes and per-group consent.
- **Reels:** upload, video processing, feed ranking, likes, comments with replies, saves, follows, reports and moderation, non-destructive video edits.
- **Notifications:** push, in-app, SMS, WhatsApp and email templates in English and Hindi, user preferences.
- **Transit,** realtime updates (Socket.IO), background worker jobs.
- **Quality:** strict TypeScript, input validation everywhere, 16 end-to-end test suites and 320 unit tests, CI on every push.

### Mobile app (Flutter)
- **Splash and sign-in:** hero banner, login/register tabs, guest mode, Hindi/English switch.
- **Home:** greeting, auto-sliding photo carousel, Live Crowd / Aarti / My Trip cards, 10-item quick access, "Plan a group yatra" card, reels strip, popular temples, festivals.
- **Temples:** list with filters, detail page, aarti timings, reminders, reviews.
- **Aarti:** lyrics and audio player per temple.
- **Pooja Items:** categorised essentials with photos.
- **Bookings:** stays, food, cabs, experiences, checkout and payment, my bookings.
- **AI Guide:** chat, voice questions, spoken and translated replies, photo scan of a temple.
- **Trip planner:** group members, stay, travel, AI or custom plan, timeline, downloadable PDF, share link.
- **My Trips:** start / end a pilgrimage, share on WhatsApp, live location switch, trip history.
- **Family tracking:** create or join a group, consent switch, members' trip status and location.
- **Reels:** For you / Following, hashtags, creator profiles with follow, likes, comments, save, share, report; create with an editor (trim, 8 filters, speed, text, sound). Demo creator **@adiyogi** with 4 Hindi reels.
- **People and profile:** creators to follow, demo pilgrims (labelled), create / edit profile with photo.
- **SOS, notifications,** emergency contacts.
- All text in English and Hindi; navy and saffron theme.

### Vendor portal (Next.js)
Partner sign-up and KYC, listings (hotels, rooms, menus, vehicles, experiences), inventory and prices, orders, payouts, staff and permissions. Tested with Playwright.

### Website and documents
Marketing website; architecture, data model, API, integrations and deployment guides; 20 decision records (ADRs); client setup checklist.

## Recent fixes
- Reels did not play on phones: video links pointed at `localhost`. Now built from the server's public address.
- Render deploy timed out: the API now opens its port immediately and seeds demo data in the background.
- WebM videos (common on Android) were rejected on upload; now accepted.
- Planner no longer schedules visits before you arrive or after you leave.
- Selected filter chips were unreadable; now white text on navy.

## What is left

### 1. Your action now
- **Redeploy on Render** (Manual Deploy → latest commit) so the new trips and family features are live.
- Install the latest APK from the `mobile-apk` GitHub workflow and try: start a trip, share on WhatsApp, create a family group, play an aarti.

### 2. Accounts, keys and content needed from the client
Full list with how-to in `docs/CLIENT_SETUP_TODO.md`. Most important:
- **Firebase** (real phone login and push notifications, including trip start / end).
- **Razorpay** with KYC and Route (real payments and vendor payouts).
- **MSG91 + DLT templates** and **WhatsApp Business** (SOS and booking messages).
- **Google Cloud** keys (maps, speech-to-text, spoken replies, photo recognition).
- **Anthropic API key** (real AI guide, planner and answer translation) and OpenAI key (knowledge search).
- **Cloudflare R2 + Stream** (storing and streaming user-uploaded reels and photos).
- OpenWeather, email provider, Sentry, app store accounts, legal pages and privacy notices.
- **Verify every aarti time** in the seed data, and the **aarti lyrics** versions, with the temples.
- **Licensed aarti recordings** and a **commercial Hindi voice** for demo reels (the free voice is non-commercial only).
- Replace or remove **demo pilgrims and sample crowd numbers** before launch.

### 3. Development still to do
- **Phase 5 — Admin portal:** temple and aarti content editor, moderation queue, vendor approval and KYC review, orders, refunds and payouts, reports.
- **Phase 6 — Hardening and release:**
  - Switch every stand-in to the real provider once keys arrive, and test end to end.
  - **Background location** for family tracking (today location is sent while the app is open).
  - In-app map view for family members (today: Google Maps link and embedded map on the tracking page).
  - Run the background worker on hosting (reel processing, reminders, payouts).
  - Production hosting (API, worker, Postgres with pgvector, Redis), backups, monitoring.
  - Security review, load test, DPDP privacy notices, desktop and tablet layout checks.
  - App icons, store listings (en + hi), signed builds, Play Store and App Store submission.
- **Nice to have:** pooja items ordering, more aartis and languages, licensed reel music, follower lists, offline trip plans.

## Where things are
| Area | Path |
|---|---|
| API | `apps/api` (new: `src/modules/trips`) |
| Mobile app | `apps/mobile` (new: `features/trips`, `features/content`) |
| Aarti lyrics and audio | `apps/mobile/assets/aarti` |
| Vendor portal | `apps/vendor-portal` |
| Website | `apps/website` |
| Docs and ADRs | `docs/`, `docs/adr/` |
| Client checklist | `docs/CLIENT_SETUP_TODO.md` |
| Render guide | `docs/DEPLOY_RENDER.md` |
