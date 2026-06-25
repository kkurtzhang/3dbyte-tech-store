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
grep -Fq "LANGFUSE_HOST" "${workflow}"
grep -Fq "/api/public/health" "${workflow}"
grep -Fq "/api/public/projects" "${workflow}"

echo "AI assistant eval workflow tests passed"
