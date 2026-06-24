#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
decision_script="${script_dir}/decide-ai-assistant-eval.sh"
test_repo="$(mktemp -d)"

cleanup() {
  rm -rf "${test_repo}"
}
trap cleanup EXIT

git -C "${test_repo}" init --quiet
git -C "${test_repo}" config user.email "ci@example.invalid"
git -C "${test_repo}" config user.name "CI"

mkdir -p "${test_repo}/apps/storefront-v3/src/app/api/ai-shopping-assistant"
printf '%s\n' "export {}" > "${test_repo}/README.ts"
git -C "${test_repo}" add README.ts
git -C "${test_repo}" commit --quiet -m "test: initial commit"

printf '%s\n' "export const runtime = true" \
  > "${test_repo}/apps/storefront-v3/src/app/api/ai-shopping-assistant/route.ts"
git -C "${test_repo}" add .
git -C "${test_repo}" commit --quiet -m "feat: change assistant runtime"
runtime_sha="$(git -C "${test_repo}" rev-parse HEAD)"
runtime_output="${test_repo}/runtime-output"

(
  cd "${test_repo}"
  GITHUB_EVENT_NAME=push \
    GITHUB_OUTPUT="${runtime_output}" \
    GITHUB_SHA="${runtime_sha}" \
    bash "${decision_script}"
)

grep -Fxq "should_run=false" "${runtime_output}"
grep -Fq "assistant runtime changed" "${runtime_output}"
rm -f "${runtime_output}"

mkdir -p \
  "${test_repo}/apps/storefront-v3/src/app/api/ai-shopping-assistant/evals"
printf '%s\n' "export const evalCase = true" \
  > "${test_repo}/apps/storefront-v3/src/app/api/ai-shopping-assistant/evals/case.ts"
git -C "${test_repo}" add .
git -C "${test_repo}" commit --quiet -m "test: change assistant eval"
eval_sha="$(git -C "${test_repo}" rev-parse HEAD)"
eval_output="${test_repo}/eval-output"

(
  cd "${test_repo}"
  GITHUB_EVENT_NAME=push \
    GITHUB_OUTPUT="${eval_output}" \
    GITHUB_SHA="${eval_sha}" \
    bash "${decision_script}"
)

grep -Fxq "should_run=true" "${eval_output}"
grep -Fq "eval-only" "${eval_output}"

manual_output="${test_repo}/manual-output"
GITHUB_EVENT_NAME=workflow_dispatch \
  GITHUB_OUTPUT="${manual_output}" \
  GITHUB_SHA="${eval_sha}" \
  bash "${decision_script}"

grep -Fxq "should_run=true" "${manual_output}"
grep -Fq "manual dispatch" "${manual_output}"

echo "AI assistant eval decision tests passed"
