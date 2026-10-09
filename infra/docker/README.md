# infra/docker

`docker-compose.yml` — local infrastructure (`pnpm dev:infra` / `pnpm dev:infra:down`):

| Service | Port(s) | Notes |
|---|---|---|
| Postgres 16 + pgvector | 5432 | user/pass/db `tirthnow`; `postgres/init.sql` also creates `tirthnow_test` and `tirthnow_shadow` |
| Redis 7 | 6379 | AOF on; tests use DB 15 |
| MinIO (R2 stand-in) | 9000 API, 9001 console | `minioadmin` / `minioadmin`; `minio-init` creates `tirthnow-public` (anonymous read) and `tirthnow-private` |
| Mailpit | 1025 SMTP, 8025 UI | catches all mail when `EMAIL_PROVIDER=smtp` |

Data lives in named volumes; `docker compose -f infra/docker/docker-compose.yml down -v` wipes it.

Production Dockerfiles (API/worker image, Next.js standalone image) land in Phase 6.
