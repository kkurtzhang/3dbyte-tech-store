#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
wait_script="${script_dir}/wait-for-staging-release.sh"
test_dir="$(mktemp -d "${TMPDIR:-/tmp}/staging-release-test.XXXXXX")"
trap 'rm -rf "${test_dir}"' EXIT

# Fake time and HTTP only: no network, real sleeps, credentials, or services.
cat > "${test_dir}/date" <<'EOF'
#!/usr/bin/env bash
cat "${TEST_STATE}/clock"
EOF
cat > "${test_dir}/sleep" <<'EOF'
#!/usr/bin/env bash
printf '%s' "$(( $(cat "${TEST_STATE}/clock") + $1 ))" > "${TEST_STATE}/clock"
EOF
cat > "${test_dir}/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
output=""; format=""; budget=""; url=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o|--output) output="$2"; shift 2 ;;
    -w|--write-out) format="$2"; shift 2 ;;
    --max-time) budget="$2"; shift 2 ;;
    --connect-timeout|--max-filesize|-H) shift 2 ;;
    -*) shift ;;
    *) url="$1"; shift ;;
  esac
done
case "${url}" in
  https://store.test/api/health) service=storefront ;;
  https://api.test/health) service=backend ;;
  https://cms.test/admin/init) service=cms ;;
  https://coolify.test/api/v1/deployments/applications/app_123?take=50&skip=0|https://coolify.test/api/v1/deployments/applications/app_123?take=50&skip=50) service=coolify ;;
  *) echo "Unexpected request: ${url}" >&2; exit 90 ;;
esac
counter="${TEST_STATE}/${service}"
count=$(( $(cat "${counter}" 2>/dev/null || printf 0) + 1 ))
printf '%s' "${count}" > "${counter}"
printf '%s %s\n' "${service}" "${budget:-unbounded}" >> "${TEST_STATE}/requests"
status=200; body='{}'; rc=0
if [ "${service}" = storefront ]; then
  body='{"releaseSha":"expected-sha"}'
  case "${TEST_SCENARIO}" in
    old_sha|coolify_failed|coolify_unrelated|coolify_older_page) body='{"releaseSha":"old-sha"}' ;;
    invalid_json) body='not-json' ;;
    missing_sha) body='{}' ;;
    unknown_sha) body='{"releaseSha":"unknown"}' ;;
    storefront_503) status=503 ;;
    recover|current_drift) if [ "${count}" -eq 1 ]; then body='{"releaseSha":"old-sha"}'; fi ;;
  esac
elif [ "${service}" = backend ]; then
  case "${TEST_SCENARIO}" in
    backend_503|coolify_failed_ready_sha) status=503 ;;
    recover|current_drift) if [ "${count}" -eq 1 ]; then status=503; fi ;;
    hang)
      if [ -z "${budget}" ]; then exit 91; fi
      printf '%s' "$(( $(cat "${TEST_STATE}/clock") + budget ))" > "${TEST_STATE}/clock"
      status=000; rc=28 ;;
  esac
elif [ "${service}" = cms ]; then
  case "${TEST_SCENARIO}" in
    cms_503) status=503 ;;
    cms_redirect) status=302 ;;
  esac
elif [ "${service}" = coolify ]; then
  body='{"deployments":[{"deployment_uuid":"dep_1","commit":"expected-sha","status":"failed"}]}'
  if [ "${TEST_SCENARIO}" = coolify_older_page ]; then
    if [[ "${url}" == *skip=0 ]]; then
      body="$(node -e 'process.stdout.write(JSON.stringify({deployments:Array.from({length:50},(_,id)=>({id,commit:"other-sha",status:"finished"}))}))')"
    fi
  fi
  if [ "${TEST_SCENARIO}" = coolify_unrelated ]; then
    body='{"deployments":[{"commit":"other-sha","status":"failed"}]}'
  fi
fi
if [ -n "${output}" ]; then printf '%s' "${body}" > "${output}"; else printf '%s' "${body}"; fi
if [ -n "${format}" ]; then printf '%s' "${status}"; fi
exit "${rc}"
EOF
chmod +x "${test_dir}/curl" "${test_dir}/sleep" "${test_dir}/date"
failures=0
run_case() {
  local scenario="$1" expected="$2"; shift 2
  local state="${test_dir}/${scenario}-${RANDOM}" rc=0
  mkdir -p "${state}"
  printf 0 > "${state}/clock"
  env PATH="${test_dir}:$PATH" TEST_STATE="${state}" TEST_SCENARIO="${scenario}" \
    STAGING_HEALTH_URL=https://store.test/api/health \
    STAGING_BACKEND_HEALTH_URL=https://api.test/health \
    STAGING_CMS_HEALTH_URL=https://cms.test/admin/init \
    EXPECTED_RELEASE_SHA=expected-sha POLL_SECONDS=1 TIMEOUT_SECONDS=3 \
    REQUEST_TIMEOUT_SECONDS=2 RELEASE_MODE=expected "$@" \
    bash "${wait_script}" > "${state}/log" 2>&1 || rc=$?
  if [ "${rc}" != "${expected}" ]; then
    echo "FAIL ${scenario}: expected exit ${expected}, got ${rc}"
    cat "${state}/log"; failures=$((failures + 1))
  fi
  last_state="${state}"
}
check() { if ! "$@"; then echo "FAIL assertion: $*"; failures=$((failures + 1)); fi; }

run_case backend_503 1
check grep -Fq 'backend=http:503' "${last_state}/log"
run_case cms_503 1
check grep -Fq 'cms=http:503' "${last_state}/log"
run_case cms_redirect 1
run_case storefront_503 1
run_case old_sha 1
run_case invalid_json 1
run_case missing_sha 1
run_case ready 0
check test -f "${last_state}/backend"
check test -f "${last_state}/cms"
check grep -Fq 'backend=http:200' "${last_state}/log"
run_case recover 0
check test "$(cat "${last_state}/storefront")" -ge 2
run_case hang 1
check test "$(cat "${last_state}/clock")" -le 3
check grep -Fq 'curl:28' "${last_state}/log"
check test "$(cat "${last_state}/backend")" -le 2
run_case coolify_older_page 1 COOLIFY_API_URL=https://coolify.test COOLIFY_API_TOKEN=fixture \
  COOLIFY_APPLICATION_UUID=app_123 COOLIFY_POLL_SECONDS=2
check grep -Fq 'ended with status failed' "${last_state}/log"
run_case coolify_failed 1 COOLIFY_API_URL=https://coolify.test COOLIFY_API_TOKEN=fixture \
  COOLIFY_APPLICATION_UUID=app_123 COOLIFY_POLL_SECONDS=2
check grep -Fq 'ended with status failed' "${last_state}/log"
run_case coolify_failed_ready_sha 1 COOLIFY_API_URL=https://coolify.test COOLIFY_API_TOKEN=fixture \
  COOLIFY_APPLICATION_UUID=app_123 COOLIFY_POLL_SECONDS=2
check grep -Fq 'ended with status failed' "${last_state}/log"
run_case coolify_unrelated 1 COOLIFY_API_URL=https://coolify.test COOLIFY_API_TOKEN=fixture \
  COOLIFY_APPLICATION_UUID=app_123 COOLIFY_POLL_SECONDS=2
check grep -Fq 'Timed out' "${last_state}/log"
check test "$(cat "${last_state}/coolify")" -le 2
run_case ready 0 RELEASE_MODE=current EXPECTED_RELEASE_SHA=
check grep -Fq 'expected=expected-sha' "${last_state}/log"
run_case current_drift 1 RELEASE_MODE=current EXPECTED_RELEASE_SHA=
run_case unknown_sha 1 RELEASE_MODE=current EXPECTED_RELEASE_SHA=
run_case ready 2 EXPECTED_RELEASE_SHA=
run_case ready 2 REQUEST_TIMEOUT_SECONDS=0
run_case ready 2 STAGING_CMS_HEALTH_URL=
run_case ready 2 RELEASE_MODE=invalid
if [ "${failures}" -ne 0 ]; then echo "${failures} readiness assertions failed"; exit 1; fi
echo 'Staging release wait tests passed (21 offline scenarios)'
