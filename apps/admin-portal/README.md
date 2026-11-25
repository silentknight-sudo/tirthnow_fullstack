# @tirth-now/admin-portal

Admin panel for the Tirth Now team: partner KYC and approval, orders and refunds,
payouts, SOS alerts, moderation, temples and aarti times, users, feature switches
and broadcasts, audit log. Next.js 14 static export, same stack as the vendor portal.

```
cp .env.example .env.local
pnpm --filter @tirth-now/admin-portal dev      # http://localhost:3004
pnpm --filter @tirth-now/admin-portal build    # static files in out/
```

Sign in with a platform admin account (seed: `admin@tirthnow.local`, password from
`SEED_ADMIN_PASSWORD`). Accounts without the `admin` or `super_admin` role are refused.

**Hosting:** `.github/workflows/admin-pages.yml` publishes it to GitHub Pages on every
push that touches it (`https://<owner>.github.io/<repo>/`). One-time: repo Settings →
Pages → Source "GitHub Actions", and add `https://<owner>.github.io` to the API's
`CORS_ORIGINS`.
