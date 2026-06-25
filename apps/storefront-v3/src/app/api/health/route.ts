import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

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

function getReleaseSha() {
  for (const key of RELEASE_IDENTITY_ENV_KEYS) {
    const releaseSha = normalizeReleaseIdentity(process.env[key])

    if (releaseSha) {
      return releaseSha
    }
  }

  return "unknown"
}

export function GET() {
  return NextResponse.json({
    releaseSha: getReleaseSha(),
    service: "storefront",
    status: "ok",
  })
}
