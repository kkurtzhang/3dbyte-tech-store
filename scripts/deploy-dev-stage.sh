#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/3dbyte-tech-store"
COMPOSE_FILE="docker/docker-compose.dev-stage.yml"
IMAGE_NAME="${CMS_IMAGE:-3dbyte-tech/cms:dev-latest}"

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

# Ensure container user can read env file
chmod 644 apps/cms/.env || true

echo "[deploy] pull-only mode: using image $IMAGE_NAME"
docker pull "$IMAGE_NAME"

# Always redeploy container so env/app config updates are applied
CMS_IMAGE="$IMAGE_NAME" docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-build cms

docker compose -f "$COMPOSE_FILE" ps

CODE="000"
for _ in $(seq 1 24); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:1337/admin || true)"
  if [ "$CODE" = "200" ] || [ "$CODE" = "301" ] || [ "$CODE" = "302" ]; then
    break
  fi
  sleep 5
done

echo "[deploy] cms_admin_status=$CODE"
if [ "$CODE" != "200" ] && [ "$CODE" != "301" ] && [ "$CODE" != "302" ]; then
  echo "[deploy] cms admin health check failed" >&2
  docker logs --tail=120 3dbyte-cms || true
  exit 1
fi

echo "[deploy] success"
