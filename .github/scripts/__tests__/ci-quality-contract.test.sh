#!/usr/bin/env bash
set -euo pipefail

workflow=".github/workflows/ci.yml"

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

required_commands=(
  'pnpm --filter=@3dbyte-tech-store/storefront-v3 lint'
  'pnpm --filter=@3dbyte-tech-store/storefront-v3 test:ci'
  'pnpm --filter=@3dbyte-tech-store/storefront-v3 build'
  'pnpm --filter=@3dbyte-tech-store/backend test:unit'
  'pnpm --filter=@3dbyte-tech-store/backend build'
  'pnpm --filter=@3dbyte-tech-store/cms build'
  'pnpm exec playwright test tests/e2e/homepage.spec.ts'
  'gitleaks dir . --redact --exit-code 1'
  'pnpm audit --audit-level=high'
)

for command in "${required_commands[@]}"; do
  if ! grep -Fq "$command" "$workflow"; then
    echo "CI is missing required command: $command" >&2
    exit 1
  fi
done
