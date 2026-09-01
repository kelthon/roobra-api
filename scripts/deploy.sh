#!/usr/bin/env bash
set -euo pipefail

# Always run from the repository root, regardless of the caller's cwd.
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Error: .env not found in the project root. Create it before running the deploy." >&2
  exit 1
fi

source "$(dirname "$0")/lib/read-env.sh"

# Postgres only runs initdb the first time its data directory is used. If DATABASE_USER
# is blank on that first run, the image silently falls back to a "postgres" superuser
# instead, and every deploy after that keeps failing with "role ... does not exist" no
# matter what .env says later — because the data directory already exists and initdb
# never runs again. Fail fast here instead of debugging that days later.
#
# DATABASE_URL is checked too: it's the only variable the `server` container actually
# connects with (DATABASE_USER/PASSWORD/NAME only provision Postgres itself) — without
# it, the deploy would "succeed" with a server that can never reach the database.
for var in DATABASE_USER DATABASE_PASSWORD DATABASE_NAME DATABASE_URL; do
  value="$(read_env_var "$var")"
  if [ -z "$value" ]; then
    echo "Error: ${var} is empty in .env. Set it before running the deploy — an empty" \
         "DATABASE_USER on the first run silently creates the wrong Postgres role and" \
         "the data directory will need to be wiped to recover." >&2
    exit 1
  fi
done

docker compose -f compose.yaml -f compose.prod.yaml up -d --build
