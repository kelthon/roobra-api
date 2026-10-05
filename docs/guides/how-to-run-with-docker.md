# How To Run With Docker

## Objective

Start the API and its Postgres database with Docker Compose, in development or in production mode.

## Prerequisites

- Docker and the Compose plugin.
- A `.env` file in the repository root, see
  [how to configure the environment](./how-to-configure-environment.md).

## Steps

### Development

1. Start the stack. Compose loads `compose.override.yaml` automatically:

   ```sh
   docker compose up -d --build
   ```

   The `server` container builds the `build` stage, bind-mounts the repository, runs
   `npx prisma generate` and then `npm run start:dev` (watch mode). The database port is published
   on `${DATABASE_PORT:-5432}`.

2. Follow the logs:

   ```sh
   docker compose logs -f server
   ```

3. Stop the stack. Add `-v` to also delete the development database (the named volume `db-data`):

   ```sh
   docker compose down
   docker compose down -v
   ```

### Production Mode

1. Pass both files explicitly, which disables the automatic override:

   ```sh
   docker compose -f compose.yaml -f compose.prod.yaml up -d --build
   ```

   On a real server use `./scripts/deploy.sh` instead, see
   [how to deploy](./how-to-deploy-app.md).

## Notes

- Do not run both stacks on the same machine: all Compose files use `name: roobra-api`, so container,
  network and volume names collide.
- `docker compose down -v` does not delete the production database: production mounts a host
  directory, and `-v` only removes named volumes.
- Why the files are split, and why the images are built this way, is in
  [the Compose ADR](../adr/2026-08-28-three-compose-files-for-dev-and-prod.md) and the
  [Docker reference](../reference/docker-setup.md).

## Troubleshooting

- **`db` exits with `mkdir: ... Permission denied`:** the `db` service must not have a `user:`
  override, see [the Postgres ADR](../adr/2026-08-28-postgres-image-pinned-and-entrypoint-permissions.md).
- **Host commands such as `npm run build` fail on files in `dist/` owned by `root`:** the dev
  container must run as `user: node` (UID 1000). If your host UID differs, align the container's
  UID/GID rather than removing the override. Reset ownership of `dist/` once, then restart.
- **`FATAL: role "..." does not exist`:** see [how to deploy](./how-to-deploy-app.md).
