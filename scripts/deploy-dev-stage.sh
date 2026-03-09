#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/3dbyte-tech-store"
COMPOSE_FILE="docker/docker-compose.dev-stage.yml"
CMS_IMAGE="${CMS_IMAGE:-3dbytetech/cms:dev-latest}"
BACKEND_IMAGE="${BACKEND_IMAGE:-3dbytetech/backend:dev-latest}"
DEPLOY_BACKEND_ONLY="${DEPLOY_BACKEND_ONLY:-1}"

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

# Backend DB preflight (redacted)
# Resolve DATABASE_URL robustly (supports quotes and ${POSTGRES_URL} indirection)
get_env_val() {
  local key="$1"
  local file="$2"
  awk -F= -v k="$key" '$1==k {sub($1"=",""); print; exit}' "$file"
}

DB_URL_RAW="$(get_env_val DATABASE_URL apps/backend/.env)"
POSTGRES_URL_RAW="$(get_env_val POSTGRES_URL apps/backend/.env)"

# trim surrounding quotes if present
DB_URL="${DB_URL_RAW%\"}"; DB_URL="${DB_URL#\"}"
POSTGRES_URL="${POSTGRES_URL_RAW%\"}"; POSTGRES_URL="${POSTGRES_URL#\"}"

# resolve indirection like DATABASE_URL=${POSTGRES_URL}
if [ -n "$POSTGRES_URL" ] && { [ "$DB_URL" = "${POSTGRES_URL}" ] || [ "$DB_URL" = "\${POSTGRES_URL}" ] || [ "$DB_URL" = "${POSTGRES_URL_RAW}" ]; }; then
  DB_URL="$POSTGRES_URL"
fi

if [ -z "$DB_URL" ]; then
  echo "[deploy] ERROR: backend DATABASE_URL unresolved/empty" >&2
  exit 1
fi

# Common EC2 container gotcha: localhost in DATABASE_URL points to container itself.
if printf '%s' "$DB_URL" | grep -Eq '@(localhost|127\.0\.0\.1)(:|/)'; then
  DB_URL="$(printf '%s' "$DB_URL" | sed -E 's#@(localhost|127\.0\.0\.1)(:|/)#@host.docker.internal\2#')"
  echo "[deploy] patched backend DATABASE_URL host: localhost -> host.docker.internal"
fi

# Write back resolved DATABASE_URL for compose container env
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

# Redis preflight: localhost inside container is usually wrong on EC2 docker runtime.
REDIS_URL_RAW="$(get_env_val REDIS_URL apps/backend/.env)"
REDIS_URL="${REDIS_URL_RAW%\"}"; REDIS_URL="${REDIS_URL#\"}"
if [ -n "$REDIS_URL" ] && printf '%s' "$REDIS_URL" | grep -Eq '://(localhost|127\.0\.0\.1)(:|/|$)'; then
  TMP_ENV="$(mktemp)"
  awk 'BEGIN{done=0} /^REDIS_URL=/{print "# REDIS_URL disabled by deploy script (localhost is invalid inside container)"; done=1; next} {print} END{if(!done) print "# REDIS_URL disabled by deploy script"}' apps/backend/.env > "$TMP_ENV"
  mv "$TMP_ENV" apps/backend/.env
  echo "[deploy] disabled REDIS_URL that pointed to localhost/127.0.0.1"
fi

# Ensure minimum required backend secrets for boot
if ! grep -q '^STRIPE_SECRET_KEY=' apps/backend/.env || [ -z "$(get_env_val STRIPE_SECRET_KEY apps/backend/.env)" ]; then
  echo 'STRIPE_SECRET_KEY=sk_test_dev_placeholder' >> apps/backend/.env
  echo '[deploy] injected STRIPE_SECRET_KEY placeholder for dev-stage boot'
fi
if ! grep -q '^STRIPE_WEBHOOK_SECRET=' apps/backend/.env || [ -z "$(get_env_val STRIPE_WEBHOOK_SECRET apps/backend/.env)" ]; then
  echo 'STRIPE_WEBHOOK_SECRET=whsec_dev_placeholder' >> apps/backend/.env
fi

chmod 644 apps/cms/.env apps/backend/.env || true

echo "[deploy] pull-only mode: CMS=$CMS_IMAGE BACKEND=$BACKEND_IMAGE"
if [ "$DEPLOY_BACKEND_ONLY" = "1" ]; then
  echo "[deploy] backend-only mode enabled (skip cms pull/recreate)"
else
  docker pull "$CMS_IMAGE"
fi
docker pull "$BACKEND_IMAGE"

# Run DB migrations before app boot (idempotent)
set +e
CMS_IMAGE="$CMS_IMAGE" BACKEND_IMAGE="$BACKEND_IMAGE" \
  docker compose -f "$COMPOSE_FILE" run --rm --no-deps backend sh -lc "pnpm medusa db:migrate"
MIG_RC=$?
set -e
if [ "$MIG_RC" -ne 0 ]; then
  echo "[deploy] WARNING: medusa db:migrate returned rc=$MIG_RC (continuing to app boot for visibility)"
fi

if [ "$DEPLOY_BACKEND_ONLY" = "1" ]; then
  CMS_IMAGE="$CMS_IMAGE" BACKEND_IMAGE="$BACKEND_IMAGE" \
    docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-build backend
else
  CMS_IMAGE="$CMS_IMAGE" BACKEND_IMAGE="$BACKEND_IMAGE" \
    docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-build cms backend
fi

docker compose -f "$COMPOSE_FILE" ps

if [ "$DEPLOY_BACKEND_ONLY" != "1" ]; then
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

echo "[deploy] success"
