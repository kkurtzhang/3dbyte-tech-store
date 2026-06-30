#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
wait_script="${script_dir}/wait-for-staging-release.sh"
test_dir="$(mktemp -d)"

cleanup() {
  rm -rf "${test_dir}"
}
trap cleanup EXIT

cat > "${test_dir}/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
counter_file="${TEST_COUNTER_FILE:?}"
count="$(cat "${counter_file}" 2>/dev/null || printf '0')"
count=$((count + 1))
printf '%s' "${count}" > "${counter_file}"

health_counter_file="${TEST_HEALTH_COUNTER_FILE:-}"
coolify_counter_file="${TEST_COOLIFY_COUNTER_FILE:-}"
is_coolify_request=false
if printf '%s\n' "$*" | grep -Fq "deployments/applications/app_123"; then
  is_coolify_request=true
  if [ -n "${coolify_counter_file}" ]; then
    coolify_count="$(cat "${coolify_counter_file}" 2>/dev/null || printf '0')"
    coolify_count=$((coolify_count + 1))
    printf '%s' "${coolify_count}" > "${coolify_counter_file}"
  fi

  if ! printf '%s\n' "$*" | grep -Eq '([?&])take=1($|&)'; then
    exit 7
  fi
elif [ -n "${health_counter_file}" ]; then
  health_count="$(cat "${health_counter_file}" 2>/dev/null || printf '0')"
  health_count=$((health_count + 1))
  printf '%s' "${health_count}" > "${health_counter_file}"
fi

case "${TEST_SCENARIO:?}" in
  success)
    if [ "${count}" -lt 2 ]; then
      printf '{"service":"storefront","status":"ok","releaseSha":"old"}'
    else
      printf '{"service":"storefront","status":"ok","releaseSha":"expected-sha"}'
    fi
    ;;
  timeout)
    printf '{"service":"storefront","status":"ok","releaseSha":"old"}'
    ;;
  coolify_failed)
    if [ "${is_coolify_request}" = true ]; then
      printf '{"deployments":[{"deployment_uuid":"dep_1","commit":"expected-sha","status":"failed"}]}'
    else
      printf '{"service":"storefront","status":"ok","releaseSha":"old"}'
    fi
    ;;
  coolify_unrelated)
    if [ "${is_coolify_request}" = true ]; then
      printf '{"deployments":[{"deployment_uuid":"dep_1","commit":"other-sha","status":"failed"}]}'
    else
      printf '{"service":"storefront","status":"ok","releaseSha":"old"}'
    fi
    ;;
esac
EOF
chmod +x "${test_dir}/curl"

cat > "${test_dir}/sleep" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "${test_dir}/sleep"

counter_file="${test_dir}/counter"
health_counter_file="${test_dir}/health-counter"
coolify_counter_file="${test_dir}/coolify-counter"

PATH="${test_dir}:$PATH" \
TEST_COUNTER_FILE="${counter_file}" \
TEST_SCENARIO=success \
STAGING_HEALTH_URL=https://store.test/api/health \
EXPECTED_RELEASE_SHA=expected-sha \
POLL_SECONDS=1 \
TIMEOUT_SECONDS=2 \
  bash "${wait_script}"

test "$(cat "${counter_file}")" = "2"

printf '0' > "${counter_file}"
if PATH="${test_dir}:$PATH" \
  TEST_COUNTER_FILE="${counter_file}" \
  TEST_SCENARIO=timeout \
  STAGING_HEALTH_URL=https://store.test/api/health \
  EXPECTED_RELEASE_SHA=expected-sha \
  POLL_SECONDS=1 \
  TIMEOUT_SECONDS=2 \
    bash "${wait_script}"; then
  echo "Expected release wait timeout to fail" >&2
  exit 1
fi

printf '0' > "${counter_file}"
if PATH="${test_dir}:$PATH" \
  TEST_COUNTER_FILE="${counter_file}" \
  TEST_SCENARIO=coolify_failed \
  STAGING_HEALTH_URL=https://store.test/api/health \
  EXPECTED_RELEASE_SHA=expected-sha \
  POLL_SECONDS=1 \
  TIMEOUT_SECONDS=30 \
  COOLIFY_API_URL=https://coolify.test \
  COOLIFY_API_TOKEN=test-token \
  COOLIFY_APPLICATION_UUID=app_123 \
    bash "${wait_script}"; then
  echo "Expected failed Coolify deployment to fail release wait" >&2
  exit 1
fi

test "$(cat "${counter_file}")" = "2"

printf '0' > "${counter_file}"
printf '0' > "${health_counter_file}"
printf '0' > "${coolify_counter_file}"
if PATH="${test_dir}:$PATH" \
  TEST_COUNTER_FILE="${counter_file}" \
  TEST_HEALTH_COUNTER_FILE="${health_counter_file}" \
  TEST_COOLIFY_COUNTER_FILE="${coolify_counter_file}" \
  TEST_SCENARIO=coolify_unrelated \
  STAGING_HEALTH_URL=https://store.test/api/health \
  EXPECTED_RELEASE_SHA=expected-sha \
  POLL_SECONDS=1 \
  TIMEOUT_SECONDS=3 \
  COOLIFY_POLL_SECONDS=3 \
  COOLIFY_API_URL=https://coolify.test \
  COOLIFY_API_TOKEN=test-token \
  COOLIFY_APPLICATION_UUID=app_123 \
    bash "${wait_script}"; then
  echo "Expected unrelated Coolify deployment to keep waiting until timeout" >&2
  exit 1
fi

test "$(cat "${health_counter_file}")" = "4"
test "$(cat "${coolify_counter_file}")" = "2"

echo "Staging release wait tests passed"
