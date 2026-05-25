#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${PG_BACKUP_DIR:-${ROOT_DIR}/backups/postgres}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ENV_FILE="${PG_BACKUP_ENV_FILE:-${ROOT_DIR}/.env}"
IFS=',' read -r -a DATABASES <<< "${PG_BACKUP_DATABASES:-medusa}"

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +a
fi

: "${POSTGRES_USER:?Set POSTGRES_USER}"
: "${OCI_NAMESPACE:?Set OCI_NAMESPACE}"
: "${OCI_BACKUP_BUCKET:?Set OCI_BACKUP_BUCKET}"

mkdir -p "${BACKUP_DIR}"

compose_args=(-f "${ROOT_DIR}/docker-compose.yml")
if [ -f "${ENV_FILE}" ]; then
  compose_args=(--env-file "${ENV_FILE}" "${compose_args[@]}")
fi

for database in "${DATABASES[@]}"; do
  database="$(echo "${database}" | xargs)"
  [ -n "${database}" ] || continue

  file="${BACKUP_DIR}/${database}-${TIMESTAMP}.dump.gz"
  object_name="${OCI_BACKUP_PREFIX:-postgres/}${database}/${database}-${TIMESTAMP}.dump.gz"

  docker compose "${compose_args[@]}" \
    exec -T postgres pg_dump \
      --username="${POSTGRES_USER}" \
      --dbname="${database}" \
      --format=custom \
      --no-owner \
      --no-acl \
    | gzip -9 > "${file}"

  oci os object put \
    --auth "${OCI_CLI_AUTH:-instance_principal}" \
    --region "${OCI_REGION:-ap-sydney-1}" \
    --namespace-name "${OCI_NAMESPACE}" \
    --bucket-name "${OCI_BACKUP_BUCKET}" \
    --name "${object_name}" \
    --file "${file}" \
    --storage-tier "${OCI_STORAGE_TIER:-Archive}" \
    --force
done

find "${BACKUP_DIR}" -type f -name '*.dump.gz' \
  -mtime +"${PG_BACKUP_RETENTION_DAYS:-14}" -delete
