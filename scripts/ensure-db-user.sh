#!/usr/bin/env bash
set -euo pipefail

# Ensures the Postgres role/database described by .env exist inside the *running* db
# container, without ever touching the data directory. This is the safe alternative to
# wiping the volume/bind mount when the cluster was initialized with the wrong
# POSTGRES_USER (see docs/guides/how-to-deploy-app.md#troubleshooting) — it never deletes anything, it
# only creates what's missing or refreshes the password to match .env.
#
# Usage: ./scripts/ensure-db-user.sh
# Requires the db service to already be up (docker compose ... up -d db).

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Error: .env not found in the project root." >&2
  exit 1
fi

source "$(dirname "$0")/lib/read-env.sh"

DATABASE_USER="$(read_env_var DATABASE_USER)"
DATABASE_PASSWORD="$(read_env_var DATABASE_PASSWORD)"
DATABASE_NAME="$(read_env_var DATABASE_NAME)"

for var_name in DATABASE_USER DATABASE_PASSWORD DATABASE_NAME; do
  if [ -z "${!var_name}" ]; then
    echo "Error: ${var_name} is empty in .env." >&2
    exit 1
  fi
done

# Escape values before splicing them into SQL below: '' for a value inside '...'
# (the password), "" for an identifier inside "..." (role/database names). Without
# this, a password or name containing a quote would break out of the SQL string.
sql_literal() { printf '%s' "$1" | sed "s/'/''/g"; }
sql_ident() { printf '%s' "$1" | sed 's/"/""/g'; }

DB_USER_LITERAL="$(sql_literal "$DATABASE_USER")"
DB_USER_IDENT="$(sql_ident "$DATABASE_USER")"
DB_PASSWORD_LITERAL="$(sql_literal "$DATABASE_PASSWORD")"
DB_NAME_LITERAL="$(sql_literal "$DATABASE_NAME")"
DB_NAME_IDENT="$(sql_ident "$DATABASE_NAME")"

COMPOSE=(docker compose -f compose.yaml -f compose.prod.yaml)

# Find a role we can already connect as. The official Postgres image trusts local
# (Unix socket) connections, but the role still has to exist. Try DATABASE_USER first —
# if the cluster was already initialized correctly, this succeeds and the script below
# becomes a no-op refresh. Otherwise fall back to "postgres", the image's own default,
# which is what a misconfigured first run creates instead.
ADMIN_ROLE=""
for candidate in "$DATABASE_USER" postgres; do
  if "${COMPOSE[@]}" exec -T db psql -U "$candidate" -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
    ADMIN_ROLE="$candidate"
    break
  fi
done

if [ -z "$ADMIN_ROLE" ]; then
  echo "Error: could not connect as '$DATABASE_USER' or 'postgres'. Is the db service running?" >&2
  exit 1
fi

echo "Connected as '$ADMIN_ROLE'. Ensuring role and database for '$DATABASE_USER' exist..."

"${COMPOSE[@]}" exec -T db psql -U "$ADMIN_ROLE" -d postgres -v ON_ERROR_STOP=1 <<-SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER_LITERAL') THEN
    CREATE ROLE "$DB_USER_IDENT" WITH LOGIN SUPERUSER PASSWORD '$DB_PASSWORD_LITERAL';
    RAISE NOTICE 'Created role "$DB_USER_IDENT"';
  ELSE
    ALTER ROLE "$DB_USER_IDENT" WITH PASSWORD '$DB_PASSWORD_LITERAL';
    RAISE NOTICE 'Role "$DB_USER_IDENT" already existed, password refreshed';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE "$DB_NAME_IDENT" OWNER "$DB_USER_IDENT"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME_LITERAL')\gexec
SQL

echo "Done. '$DATABASE_USER' can now authenticate against '$DATABASE_NAME'."
