# ADR-0014: Vendor roles reach the client on the next token refresh

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Access tokens (15 min) carry `roles` and `vendorIds`. When a user creates a vendor or
is added as staff, their current token predates the new role.

## Decision

- Vendor endpoints authorise with `VendorAccessGuard`, which reads membership and
  permissions from the database, so new staff can act immediately.
- Role-gated features that rely on token claims (e.g. staff-only upload purposes) see
  the new role after the client refreshes its token. The portal refreshes right after
  creating a vendor or accepting an invite (`POST /v1/auth/refresh`).
- Revocation (staff removed, vendor suspended) takes effect immediately for vendor
  endpoints (DB check) and within one access-token lifetime elsewhere.

## Alternatives considered

- Re-issuing tokens server-side on role change: needs push to the client anyway.
- Looking up roles on every request: removes the benefit of stateless access tokens.

## Consequences

- Clients must call refresh after onboarding steps; documented in `docs/API.md`.
