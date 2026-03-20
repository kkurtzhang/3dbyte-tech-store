# Dev-Stage Architecture

Last updated: 2026-03-09

## Overview

Dev-stage runs on EC2 with Nginx in front of Docker Compose services.

Public endpoints:
- API: `https://api-dev.3dbytetech.com`
- CMS: `https://cms-dev.3dbytetech.com`

## Services

Docker Compose file:
- `docker/docker-compose.dev-stage.yml`

Primary services:
- `backend` — Medusa server mode
- `worker` — Medusa worker mode
- `cms` — Strapi CMS
- `meilisearch` — search/index dependency

## Medusa Runtime Split

Medusa is deployed as two containers using the same backend image:

- `backend`
  - `MEDUSA_WORKER_MODE=server`
  - `DISABLE_MEDUSA_ADMIN=false`
  - public port `9000`
- `worker`
  - `MEDUSA_WORKER_MODE=worker`
  - `DISABLE_MEDUSA_ADMIN=true`
  - no public port

Medusa config knobs are wired in `apps/backend/medusa-config.ts`.

## Reverse Proxy

EC2 uses Nginx.

Relevant config:
- `/etc/nginx/sites-available/3dbyte-dev.conf`

Routing:
- `api-dev.3dbytetech.com` → `127.0.0.1:9000`
- `cms-dev.3dbytetech.com` → `127.0.0.1:1337`

## Databases

Backend and CMS now use separate Neon databases.

- Backend DB: `medusa_3dbytetech`
- CMS DB: `strapi_3dbytetech`

Do not collapse CMS and Medusa back into one shared application database.

## Backend Image Notes

Backend image is intentionally optimized for backend-only deployment:
- multi-stage build
- no `COPY . .`
- copies only backend app + required shared packages
- current deployed size is roughly `186 MB`

Runtime command runs:
- `medusa db:migrate`
- then `medusa start`

## CMS Image Notes

CMS image does not copy the whole repo.
It currently copies:
- `apps/cms`
- required shared packages

Current deployed size is roughly `719 MB`.

## Deploy Flow

Primary deploy script:
- `scripts/deploy-dev-stage.sh`

Current behavior:
- sync `main` on EC2
- ensure env files exist
- start `meilisearch`
- recreate only changed services
- backend deploy includes both `backend` and `worker`
- prune old Docker images after recreate
- extended backend health window to allow cold start after migrate/index sync

## Health Checks

Useful checks:
- API local: `http://127.0.0.1:9000/health`
- API public: `https://api-dev.3dbytetech.com/health`
- CMS public: `https://cms-dev.3dbytetech.com/admin`

## Important Operational Notes

- Native ARM GitHub runners are used for image builds.
- EC2 previously hit disk pressure during image pulls; deploy script now prunes old Docker images.
- Meilisearch must be up before backend/worker startup.
- Worker staying `running` is part of deploy validation.
- Strapi Meilisearch plugin persists credentials in `strapi_core_store_settings`. If `MEILISEARCH_API_KEY` is removed from env, the old stored key may survive and keep breaking sync/admin operations until cleared.
- CMS bootstrap now clears `plugin_meilisearch_meilisearch_api_key` automatically when `MEILISEARCH_API_KEY` is empty, so stale restored/store values do not linger.
