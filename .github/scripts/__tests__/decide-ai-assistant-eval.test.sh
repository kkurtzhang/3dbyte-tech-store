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

grep -Fxq "should_run=true" "${runtime_output}"
grep -Fxq "mode=post-deploy" "${runtime_output}"
grep -Fxq "attempts=3" "${runtime_output}"
grep -Fxq "wait_for_release=true" "${runtime_output}"
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
grep -Fxq "mode=eval-only" "${eval_output}"
grep -Fxq "attempts=1" "${eval_output}"
grep -Fxq "wait_for_release=false" "${eval_output}"
grep -Fq "eval-only" "${eval_output}"
rm -f "${eval_output}"

mkdir -p "${test_repo}/.github/scripts/__tests__"
printf '%s\n' "echo deploy-only" \
  > "${test_repo}/.github/scripts/__tests__/coolify-compose-build-stability.test.sh"
git -C "${test_repo}" add .
git -C "${test_repo}" commit --quiet -m "test: change deploy script test"
deploy_sha="$(git -C "${test_repo}" rev-parse HEAD)"
deploy_output="${test_repo}/deploy-output"

(
  cd "${test_repo}"
  GITHUB_EVENT_NAME=push \
    GITHUB_OUTPUT="${deploy_output}" \
    GITHUB_SHA="${deploy_sha}" \
    bash "${decision_script}"
)

grep -Fxq "should_run=false" "${deploy_output}"
grep -Fxq "mode=skip" "${deploy_output}"
grep -Fxq "attempts=0" "${deploy_output}"
grep -Fxq "wait_for_release=false" "${deploy_output}"
grep -Fq "no assistant runtime or eval files changed" "${deploy_output}"

manual_output="${test_repo}/manual-output"
GITHUB_EVENT_NAME=workflow_dispatch \
  GITHUB_OUTPUT="${manual_output}" \
  GITHUB_SHA="${eval_sha}" \
  bash "${decision_script}"

grep -Fxq "should_run=true" "${manual_output}"
grep -Fxq "mode=manual" "${manual_output}"
grep -Fxq "attempts=3" "${manual_output}"
grep -Fxq "wait_for_release=false" "${manual_output}"
grep -Fq "manual dispatch" "${manual_output}"

manual_one_output="${test_repo}/manual-one-output"
GITHUB_EVENT_NAME=workflow_dispatch \
  GITHUB_OUTPUT="${manual_one_output}" \
  GITHUB_SHA="${eval_sha}" \
  AI_ASSISTANT_EVAL_WORKFLOW_ATTEMPTS=1 \
  bash "${decision_script}"

grep -Fxq "attempts=1" "${manual_one_output}"

echo "AI assistant eval decision tests passed"
