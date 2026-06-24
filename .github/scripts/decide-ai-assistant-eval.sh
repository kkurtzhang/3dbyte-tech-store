#!/usr/bin/env bash

set -euo pipefail

output_file="${GITHUB_OUTPUT:?GITHUB_OUTPUT must be set}"

write_decision() {
  printf 'should_run=%s\n' "$1" >> "${output_file}"
  printf 'reason=%s\n' "$2" >> "${output_file}"
}

if [ "${GITHUB_EVENT_NAME:-}" != "push" ]; then
  write_decision "true" "manual dispatch"
  exit 0
fi

if [ -z "${GITHUB_SHA:-}" ]; then
  write_decision \
    "false" \
    "unable to determine changed files; run workflow_dispatch after Coolify deploy"
  exit 0
fi

if git rev-parse --verify "${GITHUB_SHA}^1" >/dev/null 2>&1; then
  changed_files="$(
    git diff --name-only "${GITHUB_SHA}^1" "${GITHUB_SHA}" 2>/dev/null
  )" || changed_files=""
else
  changed_files="$(
    git diff-tree --root --no-commit-id --name-only -r "${GITHUB_SHA}" \
      2>/dev/null
  )" || changed_files=""
fi

if [ -z "${changed_files}" ]; then
  write_decision \
    "false" \
    "unable to determine changed files; run workflow_dispatch after Coolify deploy"
  exit 0
fi

printf 'Changed files:\n%s\n' "${changed_files}"

runtime_changed="$(
  printf '%s\n' "${changed_files}" |
    awk '
      /^apps\/storefront-v3\/src\/app\/api\/ai-shopping-assistant\// &&
      !/\/__tests__\// &&
      !/\/evals\// &&
      !/\.(spec|test)\.[cm]?[jt]sx?$/ {
        print
      }
    '
)"

if [ -n "${runtime_changed}" ]; then
  printf 'Deploy-required assistant files:\n%s\n' "${runtime_changed}"
  write_decision \
    "false" \
    "assistant runtime changed; run workflow_dispatch after Coolify deploy"
  exit 0
fi

write_decision "true" "eval-only or docs/workflow change"
