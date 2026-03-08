#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/3dbyte-tech-store"
COMPOSE_FILE="docker/docker-compose.dev-stage.yml"
CMS_IMAGE="${CMS_IMAGE:-3dbytetech/cms:dev-latest}"
BACKEND_IMAGE="${BACKEND_IMAGE:-3dbytetech/backend:dev-latest}"

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

chmod 644 apps/cms/.env apps/backend/.env || true

echo "[deploy] pull-only mode: CMS=$CMS_IMAGE BACKEND=$BACKEND_IMAGE"
docker pull "$CMS_IMAGE"
docker pull "$BACKEND_IMAGE"

CMS_IMAGE="$CMS_IMAGE" BACKEND_IMAGE="$BACKEND_IMAGE" \
  docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-build cms backend

docker compose -f "$COMPOSE_FILE" ps

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
