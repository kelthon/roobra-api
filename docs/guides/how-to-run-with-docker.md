---
doc-status: draft
---

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

2. Create the tables. Compose does not apply migrations, so a new database is empty until you run
   them in the `server` container, which has the Prisma CLI version from `package-lock.json`:

   ```sh
   docker compose exec server npx prisma migrate deploy
   ```

   The container reaches the database through `DATABASE_URL`, so its host must be `postgres`, not
   `localhost` (see [how to configure the environment](./how-to-configure-environment.md), step 2).

3. Load the development data. The seed creates plans, a sample catalog and four accounts,
   `subscriber@roobra.test`, `guest@roobra.test`, `staff@roobra.test` (content manager) and
   `admin@roobra.test`, all with the password in `prisma/seeds/constants.ts`. It is safe to run
   again: every step upserts its records or skips those that already exist.

   ```sh
   docker compose exec server npx prisma db seed
   ```

4. Follow the logs:

   ```sh
   docker compose logs -f server
   ```

5. Stop the stack. Add `-v` to also delete the development database and Redis data (the named volumes `postgres-data` and `redis-data`):

   ```sh
   docker compose down
   docker compose down -v
   ```

### After Changing Dependencies

1. When `package.json` or `package-lock.json` changes, after a pull, a checkout or a rebase, rebuild
   the image and renew the container's `node_modules`:

   ```sh
   docker compose up -d --build --renew-anon-volumes server
   ```

   `node_modules` lives in an anonymous volume, filled from the image only when the volume is
   created. `--build` and `--force-recreate` can hand the old volume to the new container, so the container would go on using
   the old dependencies. `--renew-anon-volumes` (`-V`) does not touch the named volumes, so the
   database and Redis data stay.

### Production Mode

1. Pass both files explicitly, which disables the automatic override:

   ```sh
   docker compose -f compose.yaml -f compose.prod.yaml up -d --build
   ```

   On a real server use `./scripts/deploy.sh` instead, see
   [how to deploy](./how-to-deploy-app.md).

## Notes

- To change the schema, edit `prisma/models/*.prisma` and create a migration with
  `docker compose exec server npx prisma migrate dev --name <change>`.
- The Prisma CLI reads only `.env` (through `prisma.config.ts`), while the app reads
  `.env.development` first. If both files set `DATABASE_URL`, keep them equal, or the CLI and the
  app will use different databases.

- Do not run both stacks on the same machine: all Compose files use `name: roobra-api`, so container,
  network and volume names collide.
- `docker compose down -v` does not delete the production database: production mounts a host
  directory, and `-v` only removes named volumes.
- Why the files are split, and why the images are built this way, is in
  [the Compose ADR](../adr/2026-08-28-03-three-compose-files-for-dev-and-prod.md) and the
  [Docker reference](../reference/docker-setup.md).

## Troubleshooting

- **`postgres` exits with `mkdir: ... Permission denied`:** the `postgres` service must not have a `user:`
  override, see [the Postgres ADR](../adr/2026-08-28-04-postgres-image-pinned-and-entrypoint-permissions.md).
- **Host commands such as `npm run build` fail on files in `dist/` owned by `root`:** the dev
  container must run as your own user. It uses `HOST_UID` and `HOST_GID` from `.env` (default
  `1000`); set them to the output of `id -u` and `id -g` rather than removing the override. Reset
  ownership of `dist/` once, then restart.
- **`FATAL: role "..." does not exist`:** see [how to deploy](./how-to-deploy-app.md).
- **`server` logs `Cannot find module` or `Cannot find type definition file` for a package that is in
  `package.json`:** the container still has the old `node_modules`, see
  [After Changing Dependencies](#after-changing-dependencies).
- **`server` restarts with `JavaScript heap out of memory`:** check first that its `node_modules` is
  current, as above. Switching branches while `start:dev` runs makes the watch compiler rebuild every
  changed file, so stop the server first (`docker compose stop server`) and start it again after.
