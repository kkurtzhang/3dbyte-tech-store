type VerifyRequiredSource = "account" | "checkout" | "registered" | "signin"

export function getSafeRedirectPath(value?: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null
  }

  return value
}

export function buildVerifyRequiredPath({
  redirectTo,
  source,
  verified,
}: {
  redirectTo?: string | null
  source?: VerifyRequiredSource
  verified?: "0" | "1"
} = {}) {
  const params = new URLSearchParams()
  const safeRedirect = getSafeRedirectPath(redirectTo)

  if (source) {
    params.set("source", source)
  }

  if (verified) {
    params.set("verified", verified)
  }

  if (safeRedirect) {
    params.set("redirect", safeRedirect)
  }

  const query = params.toString()

  return query ? `/verify-required?${query}` : "/verify-required"
}
