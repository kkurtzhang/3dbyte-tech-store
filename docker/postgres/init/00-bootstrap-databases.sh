#!/bin/sh
set -eu

: "${POSTGRES_USER:?Set POSTGRES_USER}"
: "${POSTGRES_DB:=medusa}"
: "${STRAPI_DATABASE_NAME:=strapi}"
: "${KARRIO_DATABASE_NAME:=karrio}"

if [ -n "${POSTGRES_PASSWORD:-}" ]; then
  export PGPASSWORD="$POSTGRES_PASSWORD"
fi

psql_cmd() {
  if [ -n "${POSTGRES_HOST:-}" ]; then
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -v ON_ERROR_STOP=1 "$@"
  else
    psql -U "$POSTGRES_USER" -v ON_ERROR_STOP=1 "$@"
  fi
}

create_database() {
  db="$1"
  exists="$(psql_cmd -d postgres -Atqc "SELECT 1 FROM pg_database WHERE datname = '$db'")"
  if [ "$exists" != "1" ]; then
    psql_cmd -d postgres -c "CREATE DATABASE \"$db\""
  fi
}

create_database "$STRAPI_DATABASE_NAME"
create_database "$KARRIO_DATABASE_NAME"

psql_cmd -d "$POSTGRES_DB" -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql_cmd -d "$STRAPI_DATABASE_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector;"
