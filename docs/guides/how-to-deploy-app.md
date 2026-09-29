# How To Deploy The App

## Objective

Deploy `roobra-api` to the production server with the Compose production stack.

## Prerequisites

- SSH access to the server.
- Docker and the Compose plugin installed on the server.
- A `.env` file in the repository root on the server, created and kept current by hand. It is not
  committed and the deploy script does not manage it. See
  [how to configure the environment](./how-to-configure-environment.md) and `.env.example` for the
  required keys.
- The repository checked out at the revision you want to deploy. The script builds whatever is in the
  working tree.

## Steps

1. Connect to the server and go to the repository.
2. Run the script:

   ```sh
   ./scripts/deploy.sh
   ```

   It moves to the repository root, checks that `.env` exists, checks that `DATABASE_USER`,
   `DATABASE_PASSWORD`, `DATABASE_NAME` and `DATABASE_URL` are non-empty, and then runs
   `docker compose -f compose.yaml -f compose.prod.yaml up -d --build`.

3. Check that both containers are up and healthy:

   ```sh
   docker compose -f compose.yaml -f compose.prod.yaml ps
   ```

The script does not create or `chown` any directory. Docker creates the database bind-mount
directory (`/var/lib/repositories/roobra-api/postgresql`) on first run, and the Postgres container
fixes its own permissions.

## Notes

- CI does not deploy. `.github/workflows/deploy.yml` runs build, lint and tests only. See
  [the deployment ADR](../adr/2026-08-28-05-manual-deployment-via-script.md) for the reasoning and for
  what a `deploy` job would need.

## Troubleshooting

### `FATAL: role "..." does not exist` From `db`

Postgres only runs `initdb` the first time its data directory is used. If `DATABASE_USER` was empty
in `.env` on that first run, the image created a `postgres` superuser instead, and every later deploy
fails the same way regardless of what `.env` says. `deploy.sh` now refuses to run with empty values
to prevent it.

**Do not start by deleting the data.** `docker compose down -v` does not help in production: the
database is a bind mount, and `-v` only removes named volumes. Deleting that directory deletes the
production database.

1. Make sure `.env` has the correct `DATABASE_USER`, `DATABASE_PASSWORD` and `DATABASE_NAME`.
2. Make sure the `db` service is running:

   ```sh
   docker compose -f compose.yaml -f compose.prod.yaml up -d db
   ```

3. Run the repair script:

   ```sh
   ./scripts/ensure-db-user.sh
   ```

   It connects with whichever role already works (`DATABASE_USER` itself if the cluster was
   correct, otherwise `postgres`), then creates the role from `.env` if missing or refreshes its
   password if present. It never drops a role, a database or data, and running it twice is safe.
   Try it before anything that touches the bind-mounted directory.
