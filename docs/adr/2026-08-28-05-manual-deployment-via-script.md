---
status: Draft
intended-status: Superseded
date: 2026-08-28
recorded-at: 2026-09-18
source: docs/deployment.md; scripts/deploy.sh; scripts/ensure-db-user.sh; .github/workflows/deploy.yml; commit 8965e50 — the legacy doc cited first was removed in the docs restructuring (see git history)
supersedes:
superseded-by: 2026-09-30-deploy-from-main-through-ghcr-and-ssh.md
---

# Deploy Manually With A Validating Script; Keep CI To Build, Lint And Test

## Context

Production runs on a single server with Docker Compose. The team needs a repeatable deploy without
building a full CD pipeline yet. An early misconfiguration showed that Postgres keeps the wrong role
forever if `DATABASE_USER` was empty on the first run of an empty data directory.

## Decision

1. Deployment is a manual step: someone with SSH access runs `./scripts/deploy.sh` on the server.
   The script runs from the repository root, requires a `.env`, requires `DATABASE_USER`,
   `DATABASE_PASSWORD`, `DATABASE_NAME` and `DATABASE_URL` to be non-empty, then runs
   `docker compose -f compose.yaml -f compose.prod.yaml up -d --build`.
2. The script creates and `chown`s nothing on the host. Docker creates the bind-mount source and the
   Postgres entrypoint fixes its own permissions (see
   [the Postgres ADR](./2026-08-28-04-postgres-image-pinned-and-entrypoint-permissions.md)).
3. `.env` is neither committed nor managed by the script; it is created and maintained on the
   server.
4. Recovery from a wrong Postgres role uses `scripts/ensure-db-user.sh`, which connects to the
   **running** `postgres` service with whichever role works and creates or refreshes the role from `.env`.
   It never drops a role, a database or data, and is safe to run twice. Wiping the production bind
   mount is never the first move.
5. The GitHub Actions workflow `deploy.yml` runs `build`, `lint` and `test` (unit and e2e) on pushes
   and pull requests to `main` and `dev`. **It does not deploy.** Its workflow name is `CI`; the file
   is still called `deploy.yml`, which is misleading and can be renamed when a deploy job is added.

## Alternatives Considered

- **Automatic deploy from CI** — not adopted yet. The missing piece is a `deploy` job gated on
  build/lint/test and restricted to `main`, connecting to the server and running `deploy.sh`.
  Rationale for deferring is not recorded beyond the current stage of the project.

## Consequences

- Deployment depends on a person and on the server's `.env` being current.
- The workflow file name is misleading; the workflow itself was renamed to `CI` on 2026-09-24.
- Steps and troubleshooting live in [the deployment guide](../guides/how-to-deploy-app.md).
