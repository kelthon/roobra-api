---
status: Draft
intended-status: Accepted
date: 2026-08-28
recorded-at: 2026-09-18
source: docs/docker.md "Why prisma generate runs inside deps"; Dockerfile; package.json
supersedes:
superseded-by:
---

# Keep The Prisma CLI In Dependencies And Generate The Client In The Docker Deps Stage

## Context

`@prisma/client` needs generated code under `src/generated/prisma` before the app can import it.
That directory is gitignored, so it is absent from the Docker build context. The `deps` stage
installs production dependencies only (`npm ci --omit=dev`).

## Decision

1. `prisma` (the CLI) lives in `dependencies`, not `devDependencies`.
2. The `deps` stage runs `npx prisma generate` right after `npm ci --omit=dev`, with `prisma/`
   bind-mounted. The `build` stage inherits `FROM deps`, so it already has the generated client.
3. Generation is **not** an npm `postinstall` script.
4. In development, `compose.override.yaml` bind-mounts the host repository over the image's `src/`,
   which hides the generated client. Its `command` therefore runs `npx prisma generate` before
   `npm run start:dev` on every container start.

## Alternatives Considered

- **`prisma` as a devDependency** — rejected: `npm ci --omit=dev` would skip it and `npx prisma
  generate` would download whatever version is latest from the registry. That breaks build
  reproducibility and can mismatch the `@prisma/client` version locked in `package-lock.json`.
- **`postinstall` script** — Rationale not recorded beyond the generation living in the Docker stage
  that needs it.

## Consequences

- Production images are reproducible: CLI and client versions both come from `package-lock.json`.
- The production image contains the Prisma CLI, because `node_modules` is copied from the `deps` stage.
- Contributors running outside Docker must run `npx prisma generate` themselves.
