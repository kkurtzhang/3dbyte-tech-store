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
    if printf '%s\n' "$*" | grep -Fq "deployments/applications/app_123"; then
      printf '{"deployments":[{"deployment_uuid":"dep_1","commit":"expected-sha","status":"failed"}]}'
    else
      printf '{"service":"storefront","status":"ok","releaseSha":"old"}'
    fi
    ;;
  coolify_unrelated)
    if printf '%s\n' "$*" | grep -Fq "deployments/applications/app_123"; then
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
if PATH="${test_dir}:$PATH" \
  TEST_COUNTER_FILE="${counter_file}" \
  TEST_SCENARIO=coolify_unrelated \
  STAGING_HEALTH_URL=https://store.test/api/health \
  EXPECTED_RELEASE_SHA=expected-sha \
  POLL_SECONDS=1 \
  TIMEOUT_SECONDS=2 \
  COOLIFY_API_URL=https://coolify.test \
  COOLIFY_API_TOKEN=test-token \
  COOLIFY_APPLICATION_UUID=app_123 \
    bash "${wait_script}"; then
  echo "Expected unrelated Coolify deployment to keep waiting until timeout" >&2
  exit 1
fi

echo "Staging release wait tests passed"
