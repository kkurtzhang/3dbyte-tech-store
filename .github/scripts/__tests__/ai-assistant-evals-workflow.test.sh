#!/usr/bin/env bash

set -euo pipefail

workflow="$(git rev-parse --show-toplevel)/.github/workflows/ai-assistant-evals.yml"

grep -Fq "id-token: write" "${workflow}"
grep -Fq "environment: staging" "${workflow}"
grep -Fq "tailscale/github-action@v4" "${workflow}"
grep -Fq "tags: tag:github-ai-eval" "${workflow}"
grep -Fq "version: latest" "${workflow}"
grep -Fq "ping: 100.68.121.61" "${workflow}"
grep -Fq "AI_ASSISTANT_EVAL_UPLOAD_LANGFUSE: \"true\"" "${workflow}"
grep -Fq 'AI_ASSISTANT_EVAL_ATTEMPTS: ${{ steps.live-eval.outputs.attempts }}' "${workflow}"
grep -Fq "bash .github/scripts/wait-for-staging-release.sh" "${workflow}"
grep -Fq 'COOLIFY_API_URL: ${{ vars.COOLIFY_API_URL || secrets.COOLIFY_API_URL || '"'"''"'"' }}' "${workflow}"
grep -Fq 'COOLIFY_API_TOKEN: ${{ secrets.COOLIFY_API_TOKEN || '"'"''"'"' }}' "${workflow}"
grep -Fq 'COOLIFY_APPLICATION_UUID: ${{ vars.COOLIFY_STAGING_APPLICATION_UUID || secrets.COOLIFY_STAGING_APPLICATION_UUID || '"'"''"'"' }}' "${workflow}"
grep -Fq 'COOLIFY_POLL_SECONDS: "60"' "${workflow}"
grep -Fq "LANGFUSE_HOST" "${workflow}"
grep -Fq "/api/public/health" "${workflow}"
grep -Fq "/api/public/projects" "${workflow}"
grep -Fq "apps/storefront-v3/src/app/api/ai-shopping-assistant/**" "${workflow}"
grep -Fq "apps/storefront-v3/scripts/run-customer-ai-evals.ts" "${workflow}"

for forbidden_path in \
  ".github/scripts/__tests__/coolify-compose-build-stability.test.sh" \
  ".github/scripts/__tests__/coolify-release-sha-env.test.sh" \
  "docs/ai-engineer-pathway/phase-3-operational-feedback.md"
do
  if grep -Fq "${forbidden_path}" "${workflow}"; then
    echo "Unexpected AI assistant eval trigger path: ${forbidden_path}" >&2
    exit 1
  fi
done

echo "AI assistant eval workflow tests passed"
