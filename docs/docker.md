# Docker Setup

This document describes how the API is containerized, the three Compose files, and the reasoning
behind decisions that are not obvious from reading the files alone.

## Dockerfile stages

The [Dockerfile](../Dockerfile) is a multi-stage build with four stages:

| Stage | Purpose |
| ------- | ----------------------------------------------------------------------------------------- |
| `base` | Sets `WORKDIR /usr/src/app` on `node:${NODE_VERSION}-alpine`. Shared by every other stage. |
| `deps` | Installs **production-only** dependencies (`npm ci --omit=dev`) and generates the Prisma client. Its `node_modules` is what ships in the final image. |
| `build` | Installs **all** dependencies (including devDependencies), copies the source, and runs `nest build`. Used directly (as the build target) for local development. |
| `final` | Minimal runtime image: copies `node_modules` from `deps` and `dist/` from `build`, runs as the non-root `node` user, and starts the app with `npm run start:prod`. This is the image used in production (default `docker compose build` target). |

### Why `prisma generate` runs inside `deps`, not as an npm `postinstall`

`@prisma/client` needs generated code under `src/generated/prisma` (see `prisma/schema.prisma`'s
`generator client` block) before the app can import it. The `deps` stage bind-mounts the `prisma/`
folder and runs `npx prisma generate` right after `npm ci --omit=dev`:

```dockerfile
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=bind,source=prisma,target=prisma \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev && npx prisma generate
```

`prisma` (the CLI) lives in `dependencies`, not `devDependencies`, in `package.json`. If it were a
devDependency, `npm ci --omit=dev` would skip installing it, and `npx prisma generate` would fall
back to downloading whatever the latest published version is from the registry — breaking build
reproducibility and risking a version mismatch with the `@prisma/client` runtime version that *is*
locked via `package-lock.json`.

The `build` stage inherits `FROM deps`, so it already has the generated client; `COPY . .` from the
host does not remove it, since `src/generated/prisma` is gitignored and therefore absent from the
build context.

This generated client baked into the image is still not enough for **development**, though:
`compose.override.yaml` bind-mounts the whole host repo over `/usr/src/app` at container start,
which replaces the image's `src/` (client included) with the host's `src/` — where the client is
normally absent, since it's gitignored. `compose.override.yaml`'s `command` therefore runs
`npx prisma generate` again before `npm run start:dev` on every container start, regenerating the
client into the bind-mounted (and now host-visible) `src/generated/prisma` instead of relying on a
developer having run it manually beforehand.

### Why the build output is flat (`dist/main.js`, not `dist/src/main.js`)

`npm run start:prod` runs `node dist/main`. For that path to exist, the TypeScript compiler's
`rootDir` for the build must be `src/`. However, the base `tsconfig.json` uses `"rootDir": "./"`
(the repository root) — required because `prisma/seed.ts` and `prisma.config.ts` live outside
`src/` and are type-checked by editors/tests against the same base config.

`tsconfig.build.json` (used only by `nest build`) narrows this for the compiled artifact:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts", "prisma", "prisma.config.ts"],
  "compilerOptions": {
    "rootDir": "./src"
  }
}
```

`prisma/seed.ts` never needs to be compiled anyway: `prisma.config.ts` runs it directly via
`ts-node prisma/seed.ts` (see `migrations.seed` in `prisma.config.ts`).

### Stray `*.tsbuildinfo` files

TypeScript's incremental build cache must never be committed or shipped in the Docker build
context. If it ends up at the repository root and gets copied via `COPY . .`, `tsc` may see it as
"nothing changed" and produce an empty `dist/`, even though the step exits `0`.

With `rootDir` overridden in `tsconfig.build.json` (see above), TypeScript's *default* location
for this cache file stops being predictable — in practice it was observed writing to
`./tsconfig.build.tsbuildinfo` at the repository root instead of inside `dist/`, both for local
builds and for `nest start --watch` running inside the dev container (which bind-mounts the whole
repo, so it reproduces the same misplaced file on the host). `tsconfig.build.json` therefore pins
the location explicitly instead of relying on the default:

```json
"tsBuildInfoFile": "./dist/tsconfig.build.tsbuildinfo"
```

This keeps the cache file inside `dist/`, where `nest-cli.json`'s `deleteOutDir: true` clears it on
every build. `*.tsbuildinfo` is still excluded in both `.gitignore` and `.dockerignore` as a second
line of defense.

## The three Compose files

| File | Loaded when... | Purpose |
| ---------------------------------------------- | --------------------------------------------------------- | ------- |
| [compose.yaml](../compose.yaml) | Always | Shared defaults for both environments. |
| [compose.override.yaml](../compose.override.yaml) | `docker compose up` with no `-f` flags (Compose auto-loads it) | Local development overrides. |
| [compose.prod.yaml](../compose.prod.yaml) | Only when passed explicitly: `-f compose.yaml -f compose.prod.yaml` | Production-only overrides. |

Passing `-f` flags explicitly (as `scripts/deploy.sh` does) disables the automatic loading of
`compose.override.yaml`, which is what keeps the dev bind mount and the prod bind mount from ever
mixing.

### `db` service: no `user: postgres` override

The official `postgres` image's entrypoint does its setup (creating the data directory with the
right permissions for the running Postgres major version, then dropping privileges) while it is
still running as `root`. Forcing `user: postgres` at the Compose level skips that setup entirely —
the container starts directly as a non-root user with no permission to create anything in the
mounted volume, which fails with `mkdir: ... Permission denied`.

This also makes the setup resilient to Postgres changing its internal data directory layout: major
version 18 (the version pinned below) defaults `PGDATA` to `/var/lib/postgresql/18/docker` (older
versions used `/var/lib/postgresql/data`). Because the volume is mounted at the parent directory
(`/var/lib/postgresql`) and the entrypoint handles permissions itself, the exact `PGDATA` subpath
does not matter — it stays inside the mount either way.

### `db` image is pinned to a major version

`image: postgres:18-alpine` — not the implicit `postgres:latest`. An unpinned tag means a routine
`docker compose ... up -d --build` could silently pull a new Postgres major version against the
existing bind-mounted (production) or named-volume (development) data directory, initialized under
the previous major version's on-disk format. Pin the major version here deliberately when
upgrading, rather than picking it up by accident.

### `server` service in dev: `user: node`

`compose.override.yaml` bind-mounts the whole repository into the container
(`.:/usr/src/app`) and runs `npm run start:dev` (`nest start --watch`), which writes compiled
output back into that same bind mount. The `build` Dockerfile stage has no `USER` instruction, so
without an explicit `user: node` override the container runs as `root`, and every file `nest`
writes to `dist/` on the host ends up owned by `root` — breaking any `npm run build`/`start:dev`
run directly on the host afterwards. `user: node` matches the same non-root user the `final` stage
uses, and its UID (`1000`) matches the default first user on most single-user Linux dev machines.
This is not guaranteed on every contributor's machine; if it causes permission issues for someone
else, the fix is a matching UID/GID, not removing the override.

### `POSTGRES_USER` / `DATABASE_USER`

The `db` service maps `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` from `DATABASE_NAME`,
`DATABASE_USER`, and `DATABASE_PASSWORD` in `.env`. Without `POSTGRES_USER`, the official image
always creates its superuser role as `postgres`, regardless of what the application's
`DATABASE_URL` expects to authenticate as — so the two must be set together.

## Running each environment

```sh
# Development (auto-includes compose.override.yaml)
docker compose up -d --build

# Production (explicit -f, override.yaml is not loaded)
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
```

Do not run both stacks at once on the same machine: all three files share `name: roobra-api`, so
dev and prod would collide on container, network, and volume names.
