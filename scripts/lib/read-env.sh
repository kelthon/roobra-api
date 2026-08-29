#!/usr/bin/env bash
# Shared by scripts/deploy.sh and scripts/ensure-db-user.sh.
#
# Reads a KEY=VALUE from .env in the current directory. Strips only a single
# matching pair of surrounding quotes, if present — unlike a naive `tr -d '"'"'"'`,
# this never touches characters *inside* the value, so a password containing an
# apostrophe, a space, or a quote survives intact.
read_env_var() {
  local raw
  raw="$(grep -E "^$1=" .env | tail -n1 | cut -d= -f2-)"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"
  case "$raw" in
    \"*\") raw="${raw:1:-1}" ;;
    \'*\') raw="${raw:1:-1}" ;;
  esac
  printf '%s' "$raw"
}
