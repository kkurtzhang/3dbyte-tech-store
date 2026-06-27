#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/coolify-scope-redeploy.sh <storefront|backend|cms|all>

Runs a scoped Docker Compose build/recreate for an existing Coolify compose
resource. This intentionally avoids --remove-orphans so a storefront-only
redeploy does not remove Medusa, CMS, Postgres, Redis, or worker containers.

Required:
  COOLIFY_PROJECT_NAME  Compose project name used by the Coolify resource.

Optional:
  COOLIFY_COMPOSE_FILE  Compose file path. Default: docker-compose.yml
  COOLIFY_ENV_FILE      Env file passed to docker compose --env-file.
  COOLIFY_SCOPE_PULL    Set to 0 to skip docker compose build --pull.
  COOLIFY_SCOPE_DRY_RUN Set to 1 to print commands without running them.
EOF
}

scope="${1:-}"

if [ -z "$scope" ] || [ "$scope" = "-h" ] || [ "$scope" = "--help" ]; then
  usage
  exit 0
fi

compose_file="${COOLIFY_COMPOSE_FILE:-docker-compose.yml}"
env_file="${COOLIFY_ENV_FILE:-}"
project_name="${COOLIFY_PROJECT_NAME:-${COMPOSE_PROJECT_NAME:-}}"
pull="${COOLIFY_SCOPE_PULL:-1}"
dry_run="${COOLIFY_SCOPE_DRY_RUN:-0}"

if [ -z "$project_name" ]; then
  echo "COOLIFY_PROJECT_NAME is required so the existing Coolify stack is targeted." >&2
  exit 2
fi

if [ ! -f "$compose_file" ]; then
  echo "Compose file not found: $compose_file" >&2
  exit 2
fi

compose=(docker compose --project-name "$project_name" -f "$compose_file")

if [ -n "$env_file" ]; then
  if [ ! -f "$env_file" ]; then
    echo "Env file not found: $env_file" >&2
    exit 2
  fi

  compose=(docker compose --env-file "$env_file" --project-name "$project_name" -f "$compose_file")
fi

run() {
  printf '[scope-redeploy]'
  printf ' %q' "$@"
  printf '\n'

  if [ "$dry_run" != "1" ]; then
    "$@"
  fi
}

build_services=()
up_args=()
health_services=()

case "$scope" in
  storefront)
    build_services=(storefront)
    up_args=(up -d --no-deps storefront)
    health_services=(storefront)
    ;;
  backend)
    build_services=(postgres-init medusa)
    up_args=(up -d postgres-init medusa medusa-worker)
    health_services=(medusa medusa-worker)
    ;;
  cms)
    build_services=(postgres-init cms)
    up_args=(up -d postgres-init cms)
    health_services=(cms)
    ;;
  all)
    build_services=()
    up_args=(up -d)
    health_services=(storefront medusa medusa-worker cms)
    ;;
  *)
    echo "Unknown scope: $scope" >&2
    usage >&2
    exit 2
    ;;
esac

build_args=(build)
if [ "$pull" != "0" ]; then
  build_args+=(--pull)
fi

run "${compose[@]}" "${build_args[@]}" "${build_services[@]}"
run "${compose[@]}" "${up_args[@]}"

if [ "$dry_run" = "1" ]; then
  exit 0
fi

wait_for_http() {
  local service="$1"
  local url="$2"
  local attempts="${3:-30}"

  for _ in $(seq 1 "$attempts"); do
    if "${compose[@]}" exec -T "$service" node -e "fetch('$url').then((res) => process.exit(res.status < 500 ? 0 : 1)).catch(() => process.exit(1))"; then
      echo "[scope-redeploy] $service healthy at $url"
      return 0
    fi
    sleep 5
  done

  echo "[scope-redeploy] $service health check failed at $url" >&2
  run "${compose[@]}" logs --tail=120 "$service" || true
  return 1
}

for service in "${health_services[@]}"; do
  case "$service" in
    storefront)
      wait_for_http storefront "http://127.0.0.1:3000/api/health" 24
      ;;
    medusa)
      wait_for_http medusa "http://127.0.0.1:9000/health" 48
      ;;
    medusa-worker)
      state="$("${compose[@]}" ps --status running --services medusa-worker | tr -d '[:space:]')"
      if [ "$state" != "medusa-worker" ]; then
        echo "[scope-redeploy] medusa-worker is not running" >&2
        run "${compose[@]}" logs --tail=120 medusa-worker || true
        exit 1
      fi
      echo "[scope-redeploy] medusa-worker running"
      ;;
    cms)
      wait_for_http cms "http://127.0.0.1:1337/admin/init" 48
      ;;
  esac
done

run "${compose[@]}" ps
echo "[scope-redeploy] success: $scope"
