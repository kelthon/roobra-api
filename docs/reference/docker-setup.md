# Docker Setup Reference

**Location:** `Dockerfile`, `compose.yaml`, `compose.override.yaml`, `compose.prod.yaml` — verified
against branch `chore/docker-limits`, 2026-10-06.

Commands are in [how to run with Docker](../guides/how-to-run-with-docker.md). The reasoning behind the
non-obvious choices is in the ADRs linked below.

## Dockerfile Stages

The base image is `node:${NODE_VERSION}-alpine` with `NODE_VERSION=24.14.0` and
`WORKDIR /usr/src/app`.

| Stage | Based on | What it does |
| --- | --- | --- |
| `base` | node alpine | Sets the working directory; shared by the others |
| `deps` | `base` | `npm ci --omit=dev --ignore-scripts` (production dependencies, no install scripts) |
| `build` | `deps` | `npm ci` (all dependencies), `COPY . .`, `npx prisma generate` with `prisma/` bind-mounted, `npm run build`. The target used for development |
| `final` | `base` | `NODE_ENV=production`, runs as `node`, copies `package.json`, `node_modules` from `deps` and `dist` from `build`, all owned by `node`, exposes `3000`, runs `npm run start:prod`. The default target, used in production |

Decisions: [Prisma CLI and generate step](../adr/2026-08-28-01-prisma-cli-as-dependency-and-generate-in-docker.md),
[flat build output](../adr/2026-08-28-02-flat-build-output-and-pinned-tsbuildinfo.md).

## Compose Files

All three files use `name: roobra-api`.

| File | Loaded | Key settings |
| --- | --- | --- |
| `compose.yaml` | Always | `server` (build context `.`, `env_file: .env`, `NODE_ENV=production`, port `${PORT:-3000}:3000`, waits for a healthy `postgres` and `redis`, limited to 0.9 CPU and 512 MB); `postgres` (`postgres:18-alpine`, volume `postgres-data:/var/lib/postgresql`, `expose` only, `pg_isready` health check, 0.9 CPU and 512 MB); `redis` (`redis:8.10-alpine`, password from `REDIS_PASSWORD`, volume `redis-data:/data`, `expose` only, `redis-cli ping` health check, 0.5 CPU and 256 MB); named volumes `postgres-data` and `redis-data` |
| `compose.override.yaml` | Automatically with a plain `docker compose up` | `server`: `target: build`, runs as `${HOST_UID:-1000}:${HOST_GID:-1000}`, `NODE_ENV=development`, command `npx prisma generate && npm run start:dev`, bind mounts `.:/usr/src/app` plus an anonymous `node_modules` volume; `postgres`: publishes `${DATABASE_PORT:-5432}:5432`; `redis`: publishes `${REDIS_PORT:-6379}:6379` |
| `compose.prod.yaml` | Only with `-f compose.yaml -f compose.prod.yaml` | `server`: `restart: unless-stopped`; `postgres`: bind mount `/var/lib/repositories/roobra-api/postgresql:/var/lib/postgresql` |

Decisions: [three Compose files](../adr/2026-08-28-03-three-compose-files-for-dev-and-prod.md),
[Postgres image and permissions](../adr/2026-08-28-04-postgres-image-pinned-and-entrypoint-permissions.md).

## Environment Mapping

| Compose variable | From `.env` |
| --- | --- |
| `POSTGRES_DB` | `DATABASE_NAME` |
| `POSTGRES_USER` | `DATABASE_USER` |
| `POSTGRES_PASSWORD` | `DATABASE_PASSWORD` |
| `REDIS_PASSWORD` (Redis `--requirepass`) | `REDIS_PASSWORD` |

The Postgres health check uses `DATABASE_USER` and `DATABASE_NAME`. The application itself connects
with `DATABASE_URL`, so the two must agree; inside Compose its host is `postgres`. Redis is not used
by the application yet.

## Build Configuration

| File | Relevant setting |
| --- | --- |
| `tsconfig.build.json` | `rootDir: ./src`, `tsBuildInfoFile: ./dist/tsconfig.build.tsbuildinfo`, excludes `test`, specs, `prisma`, `prisma.config.ts` |
| `nest-cli.json` | `deleteOutDir: true`, copies `**/*.hbs` assets |
| `.dockerignore`, `.gitignore` | Both exclude `*.tsbuildinfo`; `.gitignore` also excludes `/src/generated/prisma` |
