#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/3dbyte-tech-store"
COMPOSE_FILE="docker/docker-compose.dev-stage.yml"
CMS_IMAGE="${CMS_IMAGE:-3dbytetech/cms:dev-latest}"
BACKEND_IMAGE="${BACKEND_IMAGE:-3dbytetech/backend:dev-latest}"
DEPLOY_BACKEND_ONLY="${DEPLOY_BACKEND_ONLY:-1}"
FORCE_RECREATE="${FORCE_RECREATE:-0}"

cd "$REPO_DIR"

git fetch origin
git reset --hard origin/main

if [ ! -f apps/cms/.env ]; then
  if [ -f apps/cms/.env.example ]; then
    cp apps/cms/.env.example apps/cms/.env
    echo "[deploy] bootstrapped apps/cms/.env from .env.example"
  else
    echo "[deploy] ERROR: apps/cms/.env missing and no .env.example" >&2
    exit 1
  fi
fi

if [ ! -f apps/backend/.env ]; then
  if [ -f apps/backend/.env.template ]; then
    cp apps/backend/.env.template apps/backend/.env
    echo "[deploy] bootstrapped apps/backend/.env from .env.template (review required)"
  else
    echo "[deploy] ERROR: apps/backend/.env missing and no .env.template" >&2
    exit 1
  fi
fi

get_env_val() {
  local key="$1"
  local file="$2"
  awk -F= -v k="$key" '$1==k {sub($1"=",""); print; exit}' "$file"
}

DB_URL_RAW="$(get_env_val DATABASE_URL apps/backend/.env)"
POSTGRES_URL_RAW="$(get_env_val POSTGRES_URL apps/backend/.env)"

DB_URL="${DB_URL_RAW%\"}"; DB_URL="${DB_URL#\"}"
POSTGRES_URL="${POSTGRES_URL_RAW%\"}"; POSTGRES_URL="${POSTGRES_URL#\"}"

if [ -n "$POSTGRES_URL" ] && { [ "$DB_URL" = "${POSTGRES_URL}" ] || [ "$DB_URL" = "\${POSTGRES_URL}" ] || [ "$DB_URL" = "${POSTGRES_URL_RAW}" ]; }; then
  DB_URL="$POSTGRES_URL"
fi

if [ -z "$DB_URL" ]; then
  echo "[deploy] ERROR: backend DATABASE_URL unresolved/empty" >&2
  exit 1
fi

if printf '%s' "$DB_URL" | grep -Eq '@(localhost|127\.0\.0\.1)(:|/)'; then
  DB_URL="$(printf '%s' "$DB_URL" | sed -E 's#@(localhost|127\.0\.0\.1)(:|/)#@host.docker.internal\2#')"
  echo "[deploy] patched backend DATABASE_URL host: localhost -> host.docker.internal"
fi

cp apps/backend/.env "apps/backend/.env.bak.$(date +%Y%m%d-%H%M%S)"
TMP_ENV="$(mktemp)"
awk -v db="$DB_URL" '
  BEGIN{done=0}
  /^DATABASE_URL=/{print "DATABASE_URL=" db; done=1; next}
  {print}
  END{if(!done) print "DATABASE_URL=" db}
' apps/backend/.env > "$TMP_ENV"
mv "$TMP_ENV" apps/backend/.env

DB_HOST="$(printf '%s' "$DB_URL" | sed -E 's#.*@([^:/?]+).*#\1#')"
DB_PORT="$(printf '%s' "$DB_URL" | sed -nE 's#.*:([0-9]+)/.*#\1#p')"
[ -z "$DB_PORT" ] && DB_PORT=5432
if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "$DB_URL" ]; then
  echo "[deploy] backend DATABASE_URL host=$DB_HOST port=$DB_PORT"
else
  echo "[deploy] WARNING: backend DATABASE_URL not parseable"
fi

REDIS_URL_RAW="$(get_env_val REDIS_URL apps/backend/.env)"
REDIS_URL="${REDIS_URL_RAW%\"}"; REDIS_URL="${REDIS_URL#\"}"
if [ -n "$REDIS_URL" ] && printf '%s' "$REDIS_URL" | grep -Eq '://(localhost|127\.0\.0\.1)(:|/|$)'; then
  TMP_ENV="$(mktemp)"
  awk 'BEGIN{done=0} /^REDIS_URL=/{print "# REDIS_URL disabled by deploy script (localhost is invalid inside container)"; done=1; next} {print} END{if(!done) print "# REDIS_URL disabled by deploy script"}' apps/backend/.env > "$TMP_ENV"
  mv "$TMP_ENV" apps/backend/.env
  echo "[deploy] disabled REDIS_URL that pointed to localhost/127.0.0.1"
fi

if ! grep -q '^STRIPE_SECRET_KEY=' apps/backend/.env || [ -z "$(get_env_val STRIPE_SECRET_KEY apps/backend/.env)" ]; then
  echo 'STRIPE_SECRET_KEY=sk_test_dev_placeholder' >> apps/backend/.env
  echo '[deploy] injected STRIPE_SECRET_KEY placeholder for dev-stage boot'
fi
if ! grep -q '^STRIPE_WEBHOOK_SECRET=' apps/backend/.env || [ -z "$(get_env_val STRIPE_WEBHOOK_SECRET apps/backend/.env)" ]; then
  echo 'STRIPE_WEBHOOK_SECRET=whsec_dev_placeholder' >> apps/backend/.env
fi

chmod 644 apps/cms/.env apps/backend/.env || true

# Smart deploy: only recreate services whose image digest changed (unless FORCE_RECREATE=1)
# Backend deploys include both server and worker because they share the same image.
services=(backend worker)
if [ "$DEPLOY_BACKEND_ONLY" != "1" ]; then
  services=(cms backend worker)
fi

declare -a recreate_services=()
for svc in "${services[@]}"; do
  if [ "$svc" = "cms" ]; then
    img="$CMS_IMAGE"
    container="3dbyte-cms"
  elif [ "$svc" = "worker" ]; then
    img="$BACKEND_IMAGE"
    container="3dbyte-worker"
  else
    img="$BACKEND_IMAGE"
    container="3dbyte-backend"
  fi

  old_img_id="$(docker inspect -f '{{.Image}}' "$container" 2>/dev/null || true)"

  echo "[deploy] pulling $svc image: $img"
  docker pull "$img"

  new_img_id="$(docker image inspect -f '{{.Id}}' "$img" 2>/dev/null || true)"

  if [ "$FORCE_RECREATE" = "1" ] || [ -z "$old_img_id" ] || [ "$old_img_id" != "$new_img_id" ]; then
    recreate_services+=("$svc")
    echo "[deploy] mark recreate: $svc"
  else
    echo "[deploy] skip recreate (image unchanged): $svc"
  fi
done

# Ensure meilisearch is running before backend migration/start
# Reuse backend MEILISEARCH_API_KEY as MEILI_MASTER_KEY for meilisearch container.
MEILISEARCH_API_KEY_RAW="$(get_env_val MEILISEARCH_API_KEY apps/backend/.env)"
MEILI_MASTER_KEY="${MEILISEARCH_API_KEY_RAW%\"}"; MEILI_MASTER_KEY="${MEILI_MASTER_KEY#\"}"
export MEILI_MASTER_KEY

# If an old container with the same explicit name exists outside current compose metadata, remove it.
docker rm -f 3dbyte-meilisearch >/dev/null 2>&1 || true
CMS_IMAGE="$CMS_IMAGE" BACKEND_IMAGE="$BACKEND_IMAGE" \
  docker compose -f "$COMPOSE_FILE" up -d --no-build meilisearch

# Runtime migration is handled inside backend container startup via predeploy.
if [ "${#recreate_services[@]}" -gt 0 ]; then
  CMS_IMAGE="$CMS_IMAGE" BACKEND_IMAGE="$BACKEND_IMAGE" \
    docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-build "${recreate_services[@]}"

  # Trim superseded Docker images/layers after successful recreate to reduce storage pressure.
  docker image prune -af >/dev/null 2>&1 || true
else
  echo "[deploy] no service image changed; skip recreate"
fi

docker compose -f "$COMPOSE_FILE" ps

# Health checks only for target services
if [ "$DEPLOY_BACKEND_ONLY" != "1" ] && printf '%s\n' "${services[@]}" | grep -qx 'cms'; then
  CMS_CODE="000"
  for _ in $(seq 1 24); do
    CMS_CODE="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/admin || true)"
    if [ "$CMS_CODE" = "200" ] || [ "$CMS_CODE" = "301" ] || [ "$CMS_CODE" = "302" ]; then
      break
    fi
    sleep 5
  done

  echo "[deploy] cms_admin_status=$CMS_CODE"
  if [ "$CMS_CODE" != "200" ] && [ "$CMS_CODE" != "301" ] && [ "$CMS_CODE" != "302" ]; then
    echo "[deploy] cms admin health check failed" >&2
    docker logs --tail=120 3dbyte-cms || true
    exit 1
  fi
fi

BACKEND_CODE="000"
for _ in $(seq 1 24); do
  BACKEND_CODE="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:9000/health || true)"
  if [ "$BACKEND_CODE" = "200" ] || [ "$BACKEND_CODE" = "204" ]; then
    break
  fi
  sleep 5
done

echo "[deploy] backend_health_status=$BACKEND_CODE"
if [ "$BACKEND_CODE" != "200" ] && [ "$BACKEND_CODE" != "204" ]; then
  echo "[deploy] backend health check failed" >&2
  docker logs --tail=160 3dbyte-backend || true
  exit 1
fi

if printf '%s\n' "${services[@]}" | grep -qx 'worker'; then
  WORKER_STATE="$(docker inspect -f '{{.State.Status}}' 3dbyte-worker 2>/dev/null || true)"
  echo "[deploy] worker_state=$WORKER_STATE"
  if [ "$WORKER_STATE" != "running" ]; then
    echo "[deploy] worker failed to stay running" >&2
    docker logs --tail=160 3dbyte-worker || true
    exit 1
  fi
fi

echo "[deploy] success"