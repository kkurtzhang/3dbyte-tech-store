#!/usr/bin/env bash

set -euo pipefail

health_url="${STAGING_HEALTH_URL:?STAGING_HEALTH_URL must be set}"
expected_release="${EXPECTED_RELEASE_SHA:?EXPECTED_RELEASE_SHA must be set}"
poll_seconds="${POLL_SECONDS:-15}"
timeout_seconds="${TIMEOUT_SECONDS:-1200}"
coolify_api_url="${COOLIFY_API_URL:-}"
coolify_api_token="${COOLIFY_API_TOKEN:-}"
coolify_application_uuid="${COOLIFY_APPLICATION_UUID:-}"
coolify_deployment_take="${COOLIFY_DEPLOYMENT_TAKE:-10}"

if ! [[ "${poll_seconds}" =~ ^[0-9]+$ ]] || [ "${poll_seconds}" -lt 1 ]; then
  echo "POLL_SECONDS must be a positive integer." >&2
  exit 2
fi

if ! [[ "${timeout_seconds}" =~ ^[0-9]+$ ]] || [ "${timeout_seconds}" -lt "${poll_seconds}" ]; then
  echo "TIMEOUT_SECONDS must be an integer greater than or equal to POLL_SECONDS." >&2
  exit 2
fi

if ! [[ "${coolify_deployment_take}" =~ ^[0-9]+$ ]] || [ "${coolify_deployment_take}" -lt 1 ]; then
  echo "COOLIFY_DEPLOYMENT_TAKE must be a positive integer." >&2
  exit 2
fi

max_attempts=$(( (timeout_seconds + poll_seconds - 1) / poll_seconds + 1 ))

extract_release_sha() {
  node -e '
    const fs = require("node:fs")
    const body = fs.readFileSync(0, "utf8")
    try {
      const parsed = JSON.parse(body)
      process.stdout.write(String(parsed.releaseSha ?? ""))
    } catch {
      process.stdout.write("")
    }
  '
}

coolify_check_enabled() {
  [ -n "${coolify_api_url}" ] &&
    [ -n "${coolify_api_token}" ] &&
    [ -n "${coolify_application_uuid}" ]
}

extract_matching_coolify_deployment() {
  EXPECTED_RELEASE_SHA="${expected_release}" node -e '
    const fs = require("node:fs")
    const body = fs.readFileSync(0, "utf8")
    const expected = process.env.EXPECTED_RELEASE_SHA || ""

    const matchesCommit = (value) => {
      const commit = String(value ?? "").trim()
      if (!commit || !expected) return false
      if (commit === expected) return true
      if (commit.length >= 7 && expected.startsWith(commit)) return true
      return expected.length >= 7 && commit.startsWith(expected)
    }

    try {
      const parsed = JSON.parse(body)
      const deployments = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.deployments)
          ? parsed.deployments
          : []
      const deployment = deployments.find((item) => matchesCommit(item?.commit))
      if (!deployment) process.exit(0)

      process.stdout.write([
        deployment.status ?? "",
        deployment.deployment_uuid ?? deployment.uuid ?? "",
        deployment.commit ?? "",
      ].join("\t"))
    } catch {
      process.exit(0)
    }
  '
}

check_coolify_deployment_status() {
  if ! coolify_check_enabled; then
    return 0
  fi

  local deployments_url
  local deployment_body
  local deployment_line
  local deployment_status=""
  local deployment_uuid=""
  local deployment_commit=""
  local tab
  local IFS

  deployments_url="${coolify_api_url%/}/api/v1/deployments/applications/${coolify_application_uuid}?take=${coolify_deployment_take}"
  deployment_body="$(
    curl -fsS \
      -H "Authorization: Bearer ${coolify_api_token}" \
      -H "Accept: application/json" \
      "${deployments_url}" 2>/dev/null || true
  )"

  if [ -z "${deployment_body}" ]; then
    echo "coolify deployment attempt=${attempt}/${max_attempts} status=unavailable expected=${expected_release}"
    return 0
  fi

  deployment_line="$(printf '%s' "${deployment_body}" | extract_matching_coolify_deployment)"

  if [ -z "${deployment_line}" ]; then
    echo "coolify deployment attempt=${attempt}/${max_attempts} status=missing expected=${expected_release}"
    return 0
  fi

  tab="$(printf '\t')"
  IFS="${tab}"
  read -r deployment_status deployment_uuid deployment_commit <<< "${deployment_line}"

  echo "coolify deployment attempt=${attempt}/${max_attempts} status=${deployment_status:-unknown} deployment=${deployment_uuid:-unknown} commit=${deployment_commit:-unknown}"

  case "${deployment_status}" in
    failed | cancelled-by-user)
      echo "Coolify deployment ${deployment_uuid:-unknown} for release ${expected_release} ended with status ${deployment_status}." >&2
      exit 1
      ;;
  esac
}

for attempt in $(seq 1 "${max_attempts}"); do
  body="$(curl -fsS "${health_url}" 2>/dev/null || true)"
  release_sha="$(printf '%s' "${body}" | extract_release_sha)"

  echo "staging health attempt=${attempt}/${max_attempts} releaseSha=${release_sha:-missing} expected=${expected_release}"

  if [ "${release_sha}" = "${expected_release}" ]; then
    exit 0
  fi

  check_coolify_deployment_status

  if [ "${attempt}" -lt "${max_attempts}" ]; then
    sleep "${poll_seconds}"
  fi
done

echo "Timed out waiting for staging release ${expected_release} at ${health_url}." >&2
exit 1
