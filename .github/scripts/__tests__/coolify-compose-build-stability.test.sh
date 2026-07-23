#!/usr/bin/env bash

set -euo pipefail

root="$(git rev-parse --show-toplevel)"
compose="${root}/docker-compose.yml"
coolify_docs="${root}/deploy/coolify/README.md"
root_pnpm_version="$(
  node -e "const pm = require('${root}/package.json').packageManager; console.log(pm.split('@')[1].split('+')[0])"
)"

config="$(docker compose -f "${compose}" config --no-interpolate)"

order_access_secret_count="$(
  grep -Fc 'ORDER_ACCESS_TOKEN_SECRET:' "${compose}"
)"

if [ "${order_access_secret_count}" -ne 2 ]; then
  echo "ORDER_ACCESS_TOKEN_SECRET must be supplied to both Medusa and the storefront."
  exit 1
fi

backend_dockerfile_count="$(
  printf '%s\n' "${config}" |
    grep -Fc 'dockerfile: docker/backend/Dockerfile.release'
)"

if [ "${backend_dockerfile_count}" -ne 1 ]; then
  echo "Expected exactly one backend release Dockerfile build, found ${backend_dockerfile_count}."
  echo "The Medusa worker should reuse the Medusa image instead of exporting a duplicate backend image."
  exit 1
fi

worker_block="$(
  printf '%s\n' "${config}" |
    sed -n '/^  medusa-worker:/,/^  [^ ]/p'
)"

if printf '%s\n' "${worker_block}" | grep -Fq 'build:'; then
  echo "medusa-worker must not define build:. It should consume the medusa image built by Coolify."
  exit 1
fi

if ! printf '%s\n' "${worker_block}" | grep -Fq 'image: ${COMPOSE_PROJECT_NAME:-3dbyte-tech-store}_medusa:${SOURCE_COMMIT:-local}'; then
  echo "medusa-worker must reference the commit-tagged medusa image via COMPOSE_PROJECT_NAME and SOURCE_COMMIT."
  exit 1
fi

if ! printf '%s\n' "${worker_block}" | grep -Fq 'pull_policy: never'; then
  echo "medusa-worker must use pull_policy: never so compose does not try to pull the local medusa image."
  exit 1
fi

if ! grep -Fq 'not define its own `build:` block' "${coolify_docs}"; then
  echo "Coolify deployment docs must explain that medusa-worker reuses the medusa image."
  exit 1
fi

if ! grep -Fq '## Recommended Watch Paths' "${coolify_docs}"; then
  echo "Coolify deployment docs must include the recommended watch paths."
  exit 1
fi

watch_paths_block="$(
  awk '
    /^## Recommended Watch Paths$/ { in_section = 1; next }
    in_section && /^## / { exit }
    in_section { print }
  ' "${coolify_docs}"
)"

for watch_path in \
  'apps/storefront-v3/**' \
  'apps/backend/**' \
  'apps/cms/**' \
  'packages/**' \
  'docker/**' \
  'docker-compose.yml' \
  'package.json' \
  'pnpm-lock.yaml' \
  'pnpm-workspace.yaml' \
  'turbo.json' \
  '.dockerignore' \
  '.node-version' \
  '.nvmrc'; do
  if ! printf '%s\n' "${watch_paths_block}" | grep -Fxq "${watch_path}"; then
    echo "Coolify deployment docs must list watch path: ${watch_path}"
    exit 1
  fi
done

if printf '%s\n' "${watch_paths_block}" | grep -Fq '.github/'; then
  echo "Coolify watch-path docs must not make GitHub workflow/script changes deployable."
  exit 1
fi

for dockerfile in \
  "${root}/apps/storefront-v3/Dockerfile" \
  "${root}/docker/backend/Dockerfile.release" \
  "${root}/docker/cms/Dockerfile.release" \
  "${root}/docker/cms/Dockerfile.dev-stage"; do
  if ! grep -Fq "ARG PNPM_VERSION=${root_pnpm_version}" "${dockerfile}"; then
    echo "${dockerfile#${root}/} must pin PNPM_VERSION to the root packageManager version (${root_pnpm_version})."
    exit 1
  fi

  if ! grep -Fq 'corepack prepare pnpm@${PNPM_VERSION} --activate' "${dockerfile}"; then
    echo "${dockerfile#${root}/} must activate pnpm via PNPM_VERSION."
    exit 1
  fi
done

echo "Coolify compose build stability tests passed"
