#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$repo_root"

grep -Fq 'MEILISEARCH_BACKEND_API_KEY:' docker-compose.yml
grep -Fq 'MEILISEARCH_CMS_API_KEY:' docker-compose.yml
! grep -Fq 'MEILISEARCH_API_KEY:' docker-compose.yml

grep -Fq 'process.env.MEILISEARCH_BACKEND_API_KEY' apps/backend/medusa-config.ts
grep -Fq 'env("MEILISEARCH_CMS_API_KEY")' apps/cms/config/plugins.ts

test ! -e apps/backend/src/api/store/search/route.ts
! rg -q 'NEXT_PUBLIC_MEILISEARCH_COLLECTION_INDEX_NAME|INDEX_COLLECTIONS' \
  apps/storefront-v3 docker-compose.yml deploy/environments .env.example

printf '%s\n' "search ownership contract passed"
