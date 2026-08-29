# Deployment

## Current process (manual)

Production is deployed by running [scripts/deploy.sh](../scripts/deploy.sh) on the target server:

```sh
./scripts/deploy.sh
```

The script:

1. `cd`s to the repository root (so it works regardless of the caller's working directory).
2. Verifies a `.env` file exists in the repository root and aborts with an error if it does not —
   `compose.yaml` requires it (`env_file: .env`) and fails with a much less clear error otherwise.
3. Verifies `DATABASE_USER`, `DATABASE_PASSWORD`, and `DATABASE_NAME` are non-empty in `.env` and
   aborts otherwise — see "Recovering from a stale Postgres data directory" below for why this
   matters enough to fail fast on.
4. Runs `docker compose -f compose.yaml -f compose.prod.yaml up -d --build`.

It does **not** create or `chown` any host directory. Docker creates the bind-mount source
directory for the `db` volume automatically on first run, and the Postgres container fixes its own
permissions on startup — see [docker.md](./docker.md#db-service-no-user-postgres-override) for why
that works without `sudo`.

### Prerequisites on the server

- Docker and the Compose plugin installed.
- A `.env` file in the repository root (see `.env.example` for the required keys). This is not
  managed by the deploy script or committed to the repository — it must be created and kept up to
  date on the server directly.

## Troubleshooting

### `FATAL: role "..." does not exist` from `db`

Postgres only runs `initdb` the first time its data directory is used. If `DATABASE_USER` was
empty in `.env` on that first run, the image silently falls back to creating a `postgres`
superuser instead. Every deploy after that keeps failing the same way, no matter what `.env` says
later — the data directory already exists, so `initdb` never runs again to pick up the correct
value. `scripts/deploy.sh` now fails fast if `DATABASE_USER`/`DATABASE_PASSWORD`/`DATABASE_NAME`
are empty, specifically to prevent this from happening again.

**`docker compose down -v` does not fix this in production.** In development, the `db` volume
(`db-data`) is a Docker-managed named volume, which `-v` removes. In production,
`compose.prod.yaml` overrides that with a **bind mount** to a real directory on the server
(`/var/lib/repositories/roobra-api/postgresql`) — `-v` only removes named volumes declared under
the top-level `volumes:` key, never bind mounts. Wiping that directory would delete the actual
production database, so it is never the right first move.

The recovery is [scripts/ensure-db-user.sh](../scripts/ensure-db-user.sh), which fixes the role
*without touching the data directory at all*:

```sh
./scripts/ensure-db-user.sh
```

It connects to the already-running `db` service (needs `db` to be up first) and, using whichever
role it can already authenticate as — `DATABASE_USER` itself if the cluster was already correct
(no-op), otherwise `postgres`, the image's own default that a misconfigured first run creates
instead — creates the role from `.env` if it is missing, or just refreshes its password if it
already exists. It never drops a role, a database, or any data; running it twice is safe. This
should always be tried before considering anything that touches the bind-mounted directory.

## CI pipeline

[.github/workflows/deploy.yml](../.github/workflows/deploy.yml) currently runs `build`, `lint`,
and `test` (including e2e) jobs on every push/PR to `main` and `dev`, and on manual dispatch.
**It does not deploy anything yet** — despite the filename, there is no job that runs
`scripts/deploy.sh` or otherwise reaches the production server. Deployment today is a manual step
performed by whoever has SSH access.

If/when this pipeline should deploy automatically, the missing piece is a `deploy` job (gated on
`build`/`lint`/`test` passing and probably restricted to `main`) that connects to the server and
runs `scripts/deploy.sh`.
