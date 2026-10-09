# infra/docker

- `docker-compose.yml` — local Postgres 16 + pgvector, Redis 7, MinIO (R2
  stand-in, buckets auto-created), Mailpit.
- `Dockerfile.api` — API + worker image (multi-stage, pnpm deploy).
- `Dockerfile.web` — Next.js standalone image for both portals (build arg selects app).

Status: **Phase 0 placeholder.** Compose file lands in Phase 1, production
Dockerfiles in Phase 6.
