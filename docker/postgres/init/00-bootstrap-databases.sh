#!/bin/sh
set -eu

: "${POSTGRES_USER:?Set POSTGRES_USER}"
: "${POSTGRES_DB:=medusa}"
: "${STRAPI_DATABASE_NAME:=strapi}"
: "${KARRIO_DATABASE_NAME:=karrio}"
: "${POSTGRES_SOCKET_DIR:=/var/run/postgresql}"

if [ -n "${POSTGRES_PASSWORD:-}" ]; then
  export PGPASSWORD="$POSTGRES_PASSWORD"
fi

psql_cmd() {
  if [ -n "${POSTGRES_SOCKET_DIR:-}" ] && [ -S "$POSTGRES_SOCKET_DIR/.s.PGSQL.5432" ]; then
    psql -h "$POSTGRES_SOCKET_DIR" -U "$POSTGRES_USER" -v ON_ERROR_STOP=1 "$@"
  elif [ -n "${POSTGRES_HOST:-}" ]; then
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -v ON_ERROR_STOP=1 "$@"
  else
    psql -U "$POSTGRES_USER" -v ON_ERROR_STOP=1 "$@"
  fi
}

if ! psql_cmd -d postgres -Atqc "SELECT 1" >/dev/null; then
  echo "Unable to connect to Postgres for bootstrap. If this is an existing volume, verify POSTGRES_USER and POSTGRES_PASSWORD match the initialized database." >&2
  exit 2
fi

if [ -n "${POSTGRES_PASSWORD:-}" ]; then
  psql_cmd -d postgres -v db_user="$POSTGRES_USER" -v db_password="$POSTGRES_PASSWORD" <<'SQL'
ALTER USER :"db_user" WITH PASSWORD :'db_password';
SQL
fi

create_database() {
  db="$1"
  exists="$(psql_cmd -d postgres -v db_name="$db" -Atq <<'SQL'
SELECT 1 FROM pg_database WHERE datname = :'db_name';
SQL
)"
  if [ "$exists" != "1" ]; then
    psql_cmd -d postgres -v db_name="$db" <<'SQL'
CREATE DATABASE :"db_name";
SQL
  fi
}

create_database "$STRAPI_DATABASE_NAME"
create_database "$KARRIO_DATABASE_NAME"

psql_cmd -d "$POSTGRES_DB" <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;
SQL
psql_cmd -d "$STRAPI_DATABASE_NAME" <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;
SQL
