---
status: Draft
intended-status: Accepted
date: 2026-08-28
recorded-at: 2026-09-18
source: docs/docker.md "The three Compose files"; compose.yaml, compose.override.yaml, compose.prod.yaml — the legacy doc cited first was removed in the docs restructuring (see git history)
supersedes:
superseded-by:
---

# Split Docker Compose Into A Shared Base, A Dev Override And A Prod Override

## Context

Development needs a bind-mounted source tree with hot reload and an exposed database port.
Production needs a compiled image and a database bind-mounted to a fixed directory on the server.
The two must never share mounts.

## Decision

| File | Loaded | Purpose |
| --- | --- | --- |
| `compose.yaml` | Always | Shared defaults (`server`, `db`, healthcheck, named volume `db-data`) |
| `compose.override.yaml` | Automatically by `docker compose up` with no `-f` | Development: `build` target, `user: node`, source bind mount, `prisma generate` + `start:dev`, published DB port |
| `compose.prod.yaml` | Only with `-f compose.yaml -f compose.prod.yaml` | Production: `restart: unless-stopped`, DB bind mount to `/var/lib/repositories/roobra-api/postgresql` |

Passing `-f` explicitly (as `scripts/deploy.sh` does) disables auto-loading of the override, which
keeps the dev and prod bind mounts from mixing.

The dev `server` runs as `user: node`. The `build` stage has no `USER` instruction, so without the
override `nest start --watch` would write `dist/` into the bind mount as `root` and break later
host-side builds. UID `1000` matches the first user on most single-user Linux machines; if it does
not match a contributor's UID, the fix is a matching UID/GID, not removing the override.

## Alternatives Considered

Rationale not recorded for alternatives such as separate Compose projects or profiles. The recorded
reasoning is only the mount isolation above.

## Consequences

- All three files share `name: roobra-api`, so **dev and prod stacks cannot run at once on the same
  machine**: container, network and volume names would collide.
- `docker compose down -v` removes the named volume in development but never the production bind
  mount, see [the deployment guide](../guides/how-to-deploy-app.md).
