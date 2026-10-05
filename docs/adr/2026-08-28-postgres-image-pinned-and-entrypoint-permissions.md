---
status: Draft
intended-status: Accepted
date: 2026-08-28
recorded-at: 2026-09-18
source: docs/docker.md "db service" sections; compose.yaml — the legacy doc cited first was removed in the docs restructuring (see git history)
supersedes:
superseded-by:
---

# Pin The Postgres Major Version And Let The Image Entrypoint Manage Permissions

## Context

Two failure modes were hit or anticipated with the `db` service:

- Forcing `user: postgres` at the Compose level skips the official image's entrypoint setup (which
  runs as `root`, creates the data directory with the right permissions, then drops privileges). The
  container then cannot create anything in the mounted volume and fails with `mkdir: ... Permission
  denied`.
- An unpinned `postgres:latest` could silently pull a new major version on a routine
  `docker compose up -d --build`, against a data directory initialized in the previous major
  version's on-disk format.

## Decision

1. `compose.yaml` uses `image: postgres:18-alpine`. Major upgrades are deliberate edits.
2. The `db` service has **no** `user:` override.
3. The volume is mounted at the parent directory `/var/lib/postgresql`, not at `PGDATA`. Postgres 18
   defaults `PGDATA` to `/var/lib/postgresql/18/docker` (older versions used
   `/var/lib/postgresql/data`), so mounting the parent stays valid across that layout change.
4. `POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD` are mapped from `DATABASE_NAME`,
   `DATABASE_USER` and `DATABASE_PASSWORD`. Without `POSTGRES_USER` the image always creates a
   `postgres` superuser, regardless of what `DATABASE_URL` expects to authenticate as.

## Alternatives Considered

- **`user: postgres`** — rejected, see Context.
- **Unpinned or `latest` tag** — rejected, see Context.

## Consequences

- Upgrading Postgres requires a planned data migration; changing the tag alone against an existing
  data directory will not work.
- `initdb` only runs on the first start of an empty data directory, so a wrong `DATABASE_USER` on the
  first run persists. [The deployment ADR](./2026-08-28-manual-deployment-via-script.md) covers the
  fail-fast check and the recovery script.
