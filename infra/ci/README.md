# infra/ci

GitHub only runs workflows from `.github/workflows/`, so the workflow files live
there and are kept thin; the reusable pieces live here:

- `scripts/` — shell steps shared by workflows (e.g. wait-for-db, prisma migrate for tests)
- `codemagic.yaml` reference for Flutter store builds (copied/linked to repo root as Codemagic requires)
- deploy workflow templates (Phase 6)

Workflows (Phase 1): `ci.yml` — lint, type-check, test, build for all apps on every PR.

Status: **Phase 0 placeholder.**
