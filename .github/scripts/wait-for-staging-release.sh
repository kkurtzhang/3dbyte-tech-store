#!/usr/bin/env bash

set -euo pipefail

health_url="${STAGING_HEALTH_URL:?STAGING_HEALTH_URL must be set}"
expected_release="${EXPECTED_RELEASE_SHA:?EXPECTED_RELEASE_SHA must be set}"
poll_seconds="${POLL_SECONDS:-15}"
timeout_seconds="${TIMEOUT_SECONDS:-1200}"

if ! [[ "${poll_seconds}" =~ ^[0-9]+$ ]] || [ "${poll_seconds}" -lt 1 ]; then
  echo "POLL_SECONDS must be a positive integer." >&2
  exit 2
fi

if ! [[ "${timeout_seconds}" =~ ^[0-9]+$ ]] || [ "${timeout_seconds}" -lt "${poll_seconds}" ]; then
  echo "TIMEOUT_SECONDS must be an integer greater than or equal to POLL_SECONDS." >&2
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

for attempt in $(seq 1 "${max_attempts}"); do
  body="$(curl -fsS "${health_url}" 2>/dev/null || true)"
  release_sha="$(printf '%s' "${body}" | extract_release_sha)"

  echo "staging health attempt=${attempt}/${max_attempts} releaseSha=${release_sha:-missing} expected=${expected_release}"

  if [ "${release_sha}" = "${expected_release}" ]; then
    exit 0
  fi

  if [ "${attempt}" -lt "${max_attempts}" ]; then
    sleep "${poll_seconds}"
  fi
done

echo "Timed out waiting for staging release ${expected_release} at ${health_url}." >&2
exit 1
