# Roobra API

Backend API for the Roobra platform — manages users, subscriptions, payments, orders, and
permissions for the Roobra website.

## Tech stack

- Node.js 24 (see `Dockerfile` for the exact pinned version)
- [NestJS](https://nestjs.com/)
- PostgreSQL via [Prisma](https://www.prisma.io/)
- Redis, BullMQ — planned, not yet wired into the codebase
- Docker / Docker Compose

## Prerequisites

- Docker with the Compose plugin
- Node.js 24+ and npm — only needed if running outside Docker

## Getting started (local development)

1. Clone the repository:

   ```sh
   git clone git@github.com:kelthon/roobra-api.git
   cd roobra-api
   ```

2. Create your local environment file:

   ```sh
   cp .env.example .env
   ```

   Fill in at least `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_URL`
   (the host in `DATABASE_URL` is `postgres`, the Compose service name), and `REDIS_PASSWORD`. Do not leave `DATABASE_USER` empty
   on the first run — see
   [the Postgres image ADR](docs/adr/2026-08-28-04-postgres-image-pinned-and-entrypoint-permissions.md)
   for why.

3. Start the stack:

   ```sh
   docker compose up -d --build
   ```

   This builds the app image, starts PostgreSQL, and runs the API in watch mode with auto-reload.
   See [how to run with Docker](docs/guides/how-to-run-with-docker.md) for the commands and the
   [Docker reference](docs/reference/docker-setup.md) for what each Compose file does.

4. Call the API with your HTTP client of choice (Postman, Insomnia, curl, ...) at
   `http://localhost:3000` (or whichever `PORT` you set in `.env`).

The database is not exposed to the host in production (`expose`, not `ports`, in `compose.yaml`).
In dev, `compose.override.yaml` publishes it at `DATABASE_HOST`:`DATABASE_PORT` from `.env` (default
`localhost:5432`), so GUI clients like DBeaver or `psql` can connect directly; the app itself
still talks to `postgres:5432` via `DATABASE_URL`, the Compose service name. You can also reach it with
`docker compose exec postgres psql -U <DATABASE_USER> -d <DATABASE_NAME>`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run start:dev` | Start the API in watch mode (what the dev container runs) |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build (`dist/main.js`) |
| `npm run lint` | Lint `src/` and `test/` with oxlint (type-aware), without fixing |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run test:cov` | Test coverage |
| `npx prisma generate` | Regenerate the Prisma client after a schema change |
| `npx prisma db seed` | Seed the database |

## Deployment

Production runs the same containers via `compose.prod.yaml` and `scripts/deploy.sh`. See
[how to deploy](docs/guides/how-to-deploy-app.md) for the full process, prerequisites and how to
recover a misconfigured database role without losing data, and
[the deployment ADR](docs/adr/2026-08-28-05-manual-deployment-via-script.md) for why CI does not deploy.

## Documentation

- [docs/README.md](docs/README.md) — index of this repository's documentation:
  [decisions](docs/adr/) (why), [guides](docs/guides/) (how to), and
  [reference](docs/reference/) (how it works today) for auth, notifications, Prisma and Docker.
- [AGENTS.md](AGENTS.md) — instructions for AI agents: where the coding, testing, git and
  documentation guidelines live, and the rules of this repository that are easy to miss.
- Cross-service and business documentation: the `roobra-docs` repository.

## License

This project is a property of [Kelthon](https://github.com/Kelthon). All rights reserved. Unauthorized use, reproduction, or distribution of this code is strictly prohibited. For inquiries or permissions, please contact the owner directly.
