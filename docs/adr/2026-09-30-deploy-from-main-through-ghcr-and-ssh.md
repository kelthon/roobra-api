---
status: Draft
intended-status: Accepted
date: 2026-09-30
recorded-at: 2026-09-30
source: maintainer CI/CD directives for roobra-docs architecture/infrastructure/ci-cd.md, 2026-09-30
supersedes: 2026-08-28-05-manual-deployment-via-script.md
superseded-by:
---

# Deploy Automatically From `main` Through GHCR And SSH, And Check More On Pull Requests

## Context

[The manual deployment ADR](./2026-08-28-05-manual-deployment-via-script.md) kept deployment manual:
someone runs `./scripts/deploy.sh` on the server, which builds the image there
(`docker compose ... up -d --build`), and the `deploy.yml` workflow only builds, lints and tests.
It named automatic deployment as the next step without adopting it. The platform is to be hosted on
a single VPS behind Cloudflare and Nginx
([roobra-docs hosting ADR](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-09-30-04-host-the-platform-on-a-single-vps-behind-cloudflare-and-nginx.md)),
which is too small to build images while serving traffic.

## Decision

1. **Every pull request runs:** ESLint with the Prettier plugin, checking only (no `--fix`); a Prettier
   format check; `tsc --noEmit`; `prisma validate`; the unit tests; the end-to-end tests; and the
   business rule id check from `roobra-docs` against this repository.
2. **Every push to `main` builds and deploys:**
   1. build the multi-stage `Dockerfile` in CI and push the image to the GitHub Container Registry
      (GHCR), tagged with the commit SHA;
   2. connect to the VPS over SSH;
   3. `docker compose pull` the new image;
   4. run `prisma migrate deploy` in a one-off container of the new image;
   5. recreate only the API container (`docker compose up -d --no-deps server`).
3. **Secrets live in GitHub Secrets** (SSH key, host, GHCR credentials); the server's `.env` stays on
   the server, as before.
4. **`main` accepts changes only through pull requests** whose checks pass.

## Alternatives Considered

- **Keep deploying by hand** (the previous ADR) — rejected: it builds on the production server and
  depends on someone remembering every step.
- **Build on the server from CI over SSH** — rejected: building competes with the running containers
  for the VPS's memory.

## Consequences

- A merge to `main` reaches production without manual steps; a failing check stops it.
- Recreating the only API container leaves a gap of a few seconds; zero-downtime needs two API
  instances behind Nginx, which is not part of this decision.
- Migrations run before the new API starts, so each migration must keep working with the previous
  API version (add first, remove in a later release).
- `scripts/deploy.sh` and `scripts/ensure-db-user.sh` stay for first setup and recovery.

## Implementation Status

Not implemented on 2026-09-30: `deploy.yml` runs `build`, `lint` (with `--fix`), `test` and
`test:e2e` on pushes and pull requests to `main` and `dev`, and deploys nothing. `main` has no branch
protection. The final stage of the `Dockerfile` copies only `package.json`, `node_modules` and
`dist`, so `prisma migrate deploy` (step 2.4) cannot run in the image until it also contains
`prisma/` and `prisma.config.ts`. No script or Compose file applies migrations today.
