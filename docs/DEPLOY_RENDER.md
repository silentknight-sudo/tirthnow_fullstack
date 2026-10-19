# Deploying the API on Render

`render.yaml` at the repo root is a Render Blueprint. It creates:

| Resource | Render type | Plan |
|---|---|---|
| `tirthnow-db` | PostgreSQL 16 (pgvector is enabled by the first migration) | Free |
| `tirthnow-redis` | Key Value (Redis-compatible, `noeviction`) | Free |
| `tirthnow-api` | Node web service (HTTP + background jobs in one process) | Free |

Every external provider stays on its mock: OTP `123456`, test checkout, mock maps,
SMS, AI and weather. That makes it a demo/staging server, not production: anyone can
sign in with any number.

## Steps

1. Push the branch you want to deploy (Render reads `render.yaml` from it).
2. In Render: **New → Blueprint**, connect GitHub, pick `tirthnow_fullstack` and the
   branch, then **Apply**.
3. Render asks for the two `sync: false` values:
   - `API_PUBLIC_URL`: `https://tirthnow-api.onrender.com` (the service URL; fix it
     later under Environment if Render gives a different name).
   - `CORS_ORIGINS`: the website origin(s), comma-separated, e.g.
     `https://tirthnow.vercel.app`. The Android app does not need CORS.
4. Wait for the first deploy. The start command applies migrations and runs the
   idempotent seed (temples, aarti schedules, hotels…), then starts the API.
5. Check `https://<service>.onrender.com/healthz` → `{"status":"ok"}`. API docs are at
   `/docs`.

## Point the Android app at it

1. GitHub → repo **Settings → Secrets and variables → Actions → Variables** → add
   `MOBILE_API_BASE_URL` = `https://<service>.onrender.com` (no `/v1`, no trailing slash).
2. **Actions → Mobile APK → Run workflow** (or push a change under `apps/mobile`).
3. Download `tirth-now-apk` from the run and install `app-release.apk`.

## Free-plan limits

- The web service sleeps after 15 minutes idle; the first request then takes ~1 minute.
- The free database expires after 30 days; upgrade to a paid plan to keep data.
- Background jobs (reminders, payouts) only run while the service is awake. For real
  use, upgrade, and run `node apps/api/dist/worker.js` as a separate Background Worker
  with `PROCESS_ROLE=worker` on it and `PROCESS_ROLE=api` on the web service.

## Going to production

Set `NODE_ENV=production`, configure the real providers listed in
`docs/CLIENT_SETUP_TODO.md` (Firebase auth, Razorpay, MSG91, storage…), and only list a
capability in `ALLOW_MOCK_PROVIDERS` deliberately. Move migrations to a paid plan's
**Pre-Deploy Command** (`pnpm --filter @tirth-now/api db:deploy`) and drop the seed from
the start command.
