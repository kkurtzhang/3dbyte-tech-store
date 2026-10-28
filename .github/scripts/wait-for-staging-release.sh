#!/usr/bin/env bash

set -euo pipefail

health_url="${STAGING_HEALTH_URL:-}"
backend_health_url="${STAGING_BACKEND_HEALTH_URL:-}"
cms_health_url="${STAGING_CMS_HEALTH_URL:-}"
release_mode="${RELEASE_MODE:-expected}"
expected_release="${EXPECTED_RELEASE_SHA:-}"
request_timeout_seconds="${REQUEST_TIMEOUT_SECONDS:-10}"

if [ -z "${health_url}" ] || [ -z "${backend_health_url}" ] || [ -z "${cms_health_url}" ]; then
  echo "STAGING_HEALTH_URL, STAGING_BACKEND_HEALTH_URL and STAGING_CMS_HEALTH_URL are required." >&2
  exit 2
fi
case "${release_mode}" in
  expected)
    if [ -z "${expected_release}" ] || [ "${expected_release}" = unknown ]; then
      echo "EXPECTED_RELEASE_SHA is required in expected release mode." >&2
      exit 2
    fi ;;
  current)
    # Eval-only/manual runs target the current deployment, not an undeployed CI commit.
    expected_release="" ;;
  *) echo "RELEASE_MODE must be expected or current." >&2; exit 2 ;;
esac
if ! [[ "${request_timeout_seconds}" =~ ^[0-9]+$ ]] || [ "${request_timeout_seconds}" -lt 1 ]; then
  echo "REQUEST_TIMEOUT_SECONDS must be a positive integer." >&2
  exit 2
fi
poll_seconds="${POLL_SECONDS:-15}"
timeout_seconds="${TIMEOUT_SECONDS:-1200}"
coolify_api_url="${COOLIFY_API_URL:-}"
coolify_api_token="${COOLIFY_API_TOKEN:-}"
coolify_application_uuid="${COOLIFY_APPLICATION_UUID:-}"
coolify_deployment_take="${COOLIFY_DEPLOYMENT_TAKE:-50}"
coolify_poll_seconds="${COOLIFY_POLL_SECONDS:-60}"

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

if ! [[ "${coolify_poll_seconds}" =~ ^[0-9]+$ ]] || [ "${coolify_poll_seconds}" -lt 1 ]; then
  echo "COOLIFY_POLL_SECONDS must be a positive integer." >&2
  exit 2
fi

started_at="$(date +%s)"
deadline=$((started_at + timeout_seconds))
max_attempts=$(( (timeout_seconds + poll_seconds - 1) / poll_seconds + 1 ))
last_coolify_check_elapsed=""
response_file="$(mktemp "${TMPDIR:-/tmp}/staging-health.XXXXXX")"
trap 'rm -f "${response_file}"' EXIT

remaining_seconds() {
  printf '%s' "$((deadline - $(date +%s)))"
}

# Every request, including optional deployment diagnostics, shares the deadline.
probe() {
  local remaining budget
  remaining="$(remaining_seconds)"
  probe_status=000
  probe_exit=28
  probe_body=""
  if [ "${remaining}" -le 0 ]; then return 0; fi
  budget="${request_timeout_seconds}"
  if [ "${remaining}" -lt "${budget}" ]; then budget="${remaining}"; fi
  : > "${response_file}"
  probe_exit=0
  probe_status="$(curl -sS --connect-timeout "${budget}" --max-time "${budget}" \
    --max-filesize 1048576 --output "${response_file}" --write-out '%{http_code}' \
    "$@" 2>/dev/null)" || probe_exit=$?
  probe_body="$(cat "${response_file}")"
}

probe_healthy() {
  [ "${probe_exit}" -eq 0 ] && [ "${probe_status}" = 200 ]
}

extract_release_sha() {
  node -e '
    const fs = require("node:fs")
    const body = fs.readFileSync(0, "utf8")
    try {
      const parsed = JSON.parse(body)
      process.stdout.write(typeof parsed.releaseSha === "string" ? parsed.releaseSha.trim() : "")
    } catch {
      process.stdout.write("")
    }
  '
}

coolify_check_enabled() {
  [ -n "${expected_release}" ] &&
    [ -n "${coolify_api_url}" ] &&
    [ -n "${coolify_api_token}" ] &&
    [ -n "${coolify_application_uuid}" ]
}

should_check_coolify_deployment_status() {
  if ! coolify_check_enabled; then
    return 1
  fi

  if [ -z "${last_coolify_check_elapsed}" ]; then
    return 0
  fi

  [ $((elapsed_seconds - last_coolify_check_elapsed)) -ge "${coolify_poll_seconds}" ]
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

  # Paginate bounded history under the same wall-clock request deadline.
  # Missing from the first page is not evidence that a webhook was not accepted.
  local page skip page_count
  for page in $(seq 0 19); do
  skip=$((page * coolify_deployment_take))
  deployments_url="${coolify_api_url%/}/api/v1/deployments/applications/${coolify_application_uuid}?take=${coolify_deployment_take}&skip=${skip}"
  probe -H "Authorization: Bearer ${coolify_api_token}" \
    -H "Accept: application/json" "${deployments_url}"
  deployment_body="${probe_body}"
  if ! probe_healthy; then deployment_body=""; fi

  if [ -z "${deployment_body}" ]; then
    echo "coolify deployment attempt=${attempt}/${max_attempts} status=unavailable expected=${expected_release}"
    return 0
  fi

  deployment_line="$(printf '%s' "${deployment_body}" | extract_matching_coolify_deployment)"

  if [ -n "${deployment_line}" ]; then break; fi
  page_count="$(printf '%s' "${deployment_body}" | node -e '
    try { const b=JSON.parse(require("node:fs").readFileSync(0,"utf8"));
      const rows=Array.isArray(b)?b:b.deployments;
      process.stdout.write(Array.isArray(rows)?String(rows.length):"invalid");
    } catch { process.stdout.write("invalid"); }')"
  if [ "${page_count}" = invalid ]; then
    echo "coolify deployment status=unavailable reason=invalid-history expected=${expected_release}"
    return 0
  fi
  if [ "${page_count}" -lt "${coolify_deployment_take}" ]; then
    echo "coolify deployment attempt=${attempt}/${max_attempts} status=missing expected=${expected_release} pages=$((page + 1))"
    return 0
  fi
  done
  if [ -z "${deployment_line}" ]; then
    echo "coolify deployment status=incomplete reason=history-limit expected=${expected_release}"
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

storefront_state=not-probed
backend_state=not-probed
cms_state=not-probed
release_sha=""
for attempt in $(seq 1 "${max_attempts}"); do
  if [ "$(remaining_seconds)" -le 0 ]; then break; fi
  elapsed_seconds=$(( $(date +%s) - started_at ))
  probe "${health_url}"
  storefront_state="http:${probe_status:-000},curl:${probe_exit}"
  storefront_ready=false
  release_sha=""
  if probe_healthy; then
    release_sha="$(printf '%s' "${probe_body}" | extract_release_sha)"
    if [ "${release_mode}" = current ] && [ -z "${expected_release}" ] &&
      [ -n "${release_sha}" ] && [ "${release_sha}" != unknown ]; then
      expected_release="${release_sha}"
    fi
    if [ -n "${expected_release}" ] && [ "${release_sha}" = "${expected_release}" ]; then
      storefront_ready=true
    fi
  fi

  probe "${backend_health_url}"
  backend_state="http:${probe_status:-000},curl:${probe_exit}"
  backend_ready=false
  if probe_healthy; then backend_ready=true; fi
  probe "${cms_health_url}"
  cms_state="http:${probe_status:-000},curl:${probe_exit}"
  cms_ready=false
  if probe_healthy; then cms_ready=true; fi

  echo "staging health attempt=${attempt}/${max_attempts} storefront=${storefront_state} releaseSha=${release_sha:-missing} expected=${expected_release:-unresolved} backend=${backend_state} cms=${cms_state}"
  if [ "${storefront_ready}" = true ] && [ "${backend_ready}" = true ] &&
    [ "${cms_ready}" = true ] && [ "$(remaining_seconds)" -gt 0 ]; then
    exit 0
  fi

  if should_check_coolify_deployment_status; then
    last_coolify_check_elapsed="${elapsed_seconds}"
    check_coolify_deployment_status
  fi
  remaining="$(remaining_seconds)"
  if [ "${remaining}" -le 0 ]; then break; fi
  pause="${poll_seconds}"
  if [ "${remaining}" -lt "${pause}" ]; then pause="${remaining}"; fi
  sleep "${pause}"
done

echo "Timed out after ${timeout_seconds}s waiting for staging readiness: expected=${expected_release:-unresolved} releaseSha=${release_sha:-missing} storefront=${storefront_state} backend=${backend_state} cms=${cms_state}. Check the reported service health and deployment logs before rerunning evaluation." >&2
exit 1
