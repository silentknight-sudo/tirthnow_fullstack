# ADR-0002: Firebase Auth on clients + our own JWT for API authorization

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Mobile users need phone OTP (dominant in India), Google, Apple (mandatory on iOS
when other social logins exist) and anonymous guest mode with later upgrade.
Building phone OTP ourselves means DLT-registered SMS, fraud/abuse controls and
per-country handling. Portal users (vendors, admins) need email + password with
optional second factor. All three clients need consistent roles (RBAC).

## Decision

- **Mobile identity** is proven by Firebase Auth. The app sends the Firebase ID
  token once to `POST /v1/auth/firebase`; the API verifies it with
  firebase-admin (via `FirebaseAuthProvider`), upserts the user, and issues:
  - an **access token**: JWT (HS256 locally; RS256/EdDSA keypair in prod),
    15-minute TTL, claims `sub`, `roles`, `vendorIds`, `sid`;
  - a **refresh token**: 256-bit opaque random, 30-day TTL, stored as sha256
    hash in `refresh_tokens`, **rotated on every use** with a `family_id` for
    reuse detection (reuse ⇒ revoke the whole family).
- **Portal identity** is email + argon2id password with optional OTP (email or
  SMS), issuing the same token pair. Portals keep the refresh token in an
  httpOnly, Secure, SameSite=Strict cookie via a Next.js route handler.
- **Authorization** is entirely ours: `JwtGuard` + `RolesGuard` + `@Roles()`;
  vendor-scoped checks via `VendorScopeGuard` using `vendorIds`.
- Firebase ID tokens are never accepted on normal API routes.

## Alternatives considered

- **Firebase ID token on every request.** Rejected: roles would live in Firebase
  custom claims (slow to propagate, size-limited), portal users would need
  Firebase too, and we'd verify tokens against Google certs on every call.
- **Fully own auth (OTP via MSG91).** Rejected for v1: more abuse surface and
  DLT work; Firebase handles reCAPTCHA/SafetyNet/App Check for OTP.
- **Auth0/Clerk.** Rejected: cost per MAU at Indian consumer scale, still need
  own RBAC.

## Consequences

- Revoking a user takes effect within ≤15 minutes (access TTL); suspensions also
  revoke all refresh families immediately.
- Locally, `FIREBASE_AUTH_PROVIDER=mock` accepts `mock:<uid>:<phone>` tokens so
  no Firebase project is needed.
- We own refresh-token storage and cleanup (nightly purge of expired rows).
