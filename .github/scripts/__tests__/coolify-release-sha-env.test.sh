#!/usr/bin/env bash

set -euo pipefail

root="$(git rev-parse --show-toplevel)"
compose="${root}/docker-compose.yml"
coolify_docs="${root}/deploy/coolify/README.md"

if grep -Fq "STOREFRONT_RELEASE_SHA:" "${compose}"; then
  echo "docker-compose.yml must not define STOREFRONT_RELEASE_SHA directly."
  echo "Coolify should inject it as a runtime-only variable so it can resolve \$SOURCE_COMMIT."
  exit 1
fi

grep -Fq 'STOREFRONT_RELEASE_SHA=$SOURCE_COMMIT' "${coolify_docs}"

echo "Coolify release SHA env tests passed"
