const RELEASE_IDENTITY_ENV_KEYS = [
  "STOREFRONT_RELEASE_SHA",
  "SOURCE_COMMIT",
  "GITHUB_SHA",
] as const

function normalizeReleaseIdentity(value: string | undefined): string | null {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  const lower = trimmed.toLowerCase()
  if (
    lower === "unknown" ||
    lower === "undefined" ||
    lower === "null" ||
    lower === "head" ||
    trimmed === "$SOURCE_COMMIT" ||
    trimmed === "${SOURCE_COMMIT}"
  ) {
    return null
  }

  return trimmed
}

export function getReleaseSha(env: NodeJS.ProcessEnv = process.env) {
  for (const key of RELEASE_IDENTITY_ENV_KEYS) {
    const releaseSha = normalizeReleaseIdentity(env[key])

    if (releaseSha) {
      return releaseSha
    }
  }

  return "unknown"
}
