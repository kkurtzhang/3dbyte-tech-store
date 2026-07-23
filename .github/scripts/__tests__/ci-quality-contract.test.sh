#!/usr/bin/env bash
set -euo pipefail

workflow=".github/workflows/ci.yml"
gitleaks_config=".gitleaks.toml"

global_env="$(
  awk '
    /^env:/ { capture = 1 }
    /^jobs:/ { capture = 0 }
    capture { print }
  ' "$workflow"
)"

if grep -Eq 'NEXT_PUBLIC_|MEDUSA_SERVER_BACKEND_URL|REDIS_URL|TRUSTED_PROXY_HOPS' <<<"$global_env"; then
  echo "Runtime integration variables must be scoped to the jobs that need them" >&2
  exit 1
fi

if grep -Fq 'JWT_SECRET: ci-only-jwt-secret' "$workflow" ||
  grep -Fq 'COOKIE_SECRET: ci-only-cookie-secret' "$workflow"; then
  echo "Production-mode CI builds must use fixtures that satisfy secret policy" >&2
  exit 1
fi

if [[ ! -f "$gitleaks_config" ]]; then
  echo "CI must use a reviewed Gitleaks configuration" >&2
  exit 1
fi

if grep -Fq -- '--filter="...[origin/main]"' "$workflow"; then
  echo "CI must compare pull requests against their actual base branch" >&2
  exit 1
fi

if grep -Fq 'continue-on-error: true' "$workflow"; then
  echo "Security and quality gates must not silently continue on failure" >&2
  exit 1
fi

if grep -Fq 'playwright test --list' "$workflow"; then
  echo "The E2E job must execute tests, not only list them" >&2
  exit 1
fi

if grep -Fq 'storefront-v3 exec tsc --noEmit' "$workflow"; then
  echo "Storefront production types belong to the Next.js build, not a generic raw tsc gate" >&2
  exit 1
fi

required_commands=(
  'pnpm --filter=@3dbyte-tech-store/storefront-v3 lint'
  'pnpm --filter=@3dbyte-tech-store/storefront-v3 test:ci'
  'pnpm --filter=@3dbyte-tech-store/storefront-v3 build'
  'pnpm --filter=@3dbyte-tech-store/backend test:unit'
  'pnpm --filter=@3dbyte-tech-store/backend build'
  'pnpm --filter=@3dbyte-tech-store/cms build'
  'pnpm --filter=@3dbyte-tech-store/observability type-check'
  'pnpm --filter=@3dbyte-tech-store/shared-types type-check'
  'pnpm --filter=@3dbyte-tech-store/shared-utils type-check'
  'pnpm exec playwright test tests/e2e/homepage.spec.ts'
  'gitleaks dir . --config .gitleaks.toml --redact --exit-code 1'
  'pnpm audit --audit-level=high'
)

for command in "${required_commands[@]}"; do
  if ! grep -Fq "$command" "$workflow"; then
    echo "CI is missing required command: $command" >&2
    exit 1
  fi
done
