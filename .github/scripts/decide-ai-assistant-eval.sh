#!/usr/bin/env bash

set -euo pipefail

output_file="${GITHUB_OUTPUT:?GITHUB_OUTPUT must be set}"

write_decision() {
  printf 'should_run=%s\n' "$1" >> "${output_file}"
  printf 'reason=%s\n' "$2" >> "${output_file}"
  printf 'mode=%s\n' "$3" >> "${output_file}"
  printf 'attempts=%s\n' "$4" >> "${output_file}"
  printf 'wait_for_release=%s\n' "$5" >> "${output_file}"
}

validate_attempts() {
  case "${1:-}" in
    "" | "3")
      printf '3'
      ;;
    "1")
      printf '1'
      ;;
    *)
      echo "AI assistant eval workflow attempts must be 1 or 3." >&2
      exit 2
      ;;
  esac
}

if [ "${GITHUB_EVENT_NAME:-}" != "push" ]; then
  attempts="$(validate_attempts "${AI_ASSISTANT_EVAL_WORKFLOW_ATTEMPTS:-}")"
  write_decision "true" "manual dispatch" "manual" "${attempts}" "false"
  exit 0
fi

if [ -z "${GITHUB_SHA:-}" ]; then
  write_decision \
    "false" \
    "unable to determine changed files; run workflow_dispatch after Coolify deploy" \
    "skip" \
    "0" \
    "false"
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
    "unable to determine changed files; run workflow_dispatch after Coolify deploy" \
    "skip" \
    "0" \
    "false"
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
    "true" \
    "assistant runtime changed; wait for staging deploy" \
    "post-deploy" \
    "3" \
    "true"
  exit 0
fi

eval_changed="$(
  printf '%s\n' "${changed_files}" |
    awk '
      /^\.github\/workflows\/ai-assistant-evals\.yml$/ ||
      /^\.github\/scripts\/decide-ai-assistant-eval\.sh$/ ||
      /^\.github\/scripts\/wait-for-staging-release\.sh$/ ||
      /^\.github\/scripts\/__tests__\/(ai-assistant-evals-workflow|decide-ai-assistant-eval|wait-for-staging-release)\.test\.sh$/ ||
      /^apps\/storefront-v3\/scripts\/run-customer-ai-evals\.ts$/ ||
      /^apps\/storefront-v3\/src\/app\/api\/ai-shopping-assistant\/evals\// {
        print
      }
    '
)"

if [ -n "${eval_changed}" ]; then
  printf 'Eval-only assistant files:\n%s\n' "${eval_changed}"
  write_decision \
    "true" \
    "eval-only assistant file changed; run against current staging release" \
    "eval-only" \
    "1" \
    "false"
  exit 0
fi

write_decision \
  "false" \
  "no assistant runtime or eval files changed" \
  "skip" \
  "0" \
  "false"
