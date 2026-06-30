#!/usr/bin/env bash

set -euo pipefail

root="$(git rev-parse --show-toplevel)"
scope_script="${root}/scripts/resolve-deploy-scope.sh"
test_repo="$(mktemp -d)"

cleanup() {
  rm -rf "${test_repo}"
}
trap cleanup EXIT

git -C "${test_repo}" init --quiet
git -C "${test_repo}" config user.email "ci@example.invalid"
git -C "${test_repo}" config user.name "CI"

mkdir -p \
  "${test_repo}/.github/workflows" \
  "${test_repo}/apps/backend/src" \
  "${test_repo}/apps/cms/src" \
  "${test_repo}/apps/storefront-v3/src" \
  "${test_repo}/docs" \
  "${test_repo}/docker/backend" \
  "${test_repo}/packages/shared-types"

printf '%s\n' "base" > "${test_repo}/README.md"
git -C "${test_repo}" add .
git -C "${test_repo}" commit --quiet -m "initial"
base_ref="$(git -C "${test_repo}" rev-parse HEAD)"

run_scope() {
  (
    cd "${test_repo}"
    bash "${scope_script}" "${base_ref}" HEAD
  )
}

printf '%s\n' "name: docs" > "${test_repo}/.github/workflows/ai-assistant-evals.yml"
git -C "${test_repo}" add .
git -C "${test_repo}" commit --quiet -m "ci: change workflow"
test "$(run_scope)" = "none"

git -C "${test_repo}" reset --quiet --hard "${base_ref}"
printf '%s\n' "docs" > "${test_repo}/docs/deployment.md"
git -C "${test_repo}" add .
git -C "${test_repo}" commit --quiet -m "docs: update deployment"
test "$(run_scope)" = "none"

git -C "${test_repo}" reset --quiet --hard "${base_ref}"
printf '%s\n' "export const storefront = true" > "${test_repo}/apps/storefront-v3/src/page.ts"
git -C "${test_repo}" add .
git -C "${test_repo}" commit --quiet -m "fix: storefront"
test "$(run_scope)" = "storefront"

git -C "${test_repo}" reset --quiet --hard "${base_ref}"
printf '%s\n' "export const backend = true" > "${test_repo}/apps/backend/src/index.ts"
git -C "${test_repo}" add .
git -C "${test_repo}" commit --quiet -m "fix: backend"
test "$(run_scope)" = "backend"

git -C "${test_repo}" reset --quiet --hard "${base_ref}"
printf '%s\n' "lock" > "${test_repo}/pnpm-lock.yaml"
git -C "${test_repo}" add .
git -C "${test_repo}" commit --quiet -m "chore: lockfile"
test "$(run_scope)" = "all"

echo "Deploy scope tests passed"
