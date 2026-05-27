type EnvRecord = Partial<Record<string, string | undefined>>

type ImageRemotePattern = {
  protocol: "https"
  hostname: string
  pathname?: string
}

const assetImageHostnameEnvKeys = [
  "NEXT_PUBLIC_SPACE_DOMAIN",
  "NEXT_PUBLIC_CDN_SPACE_DOMAIN",
  "NEXT_PUBLIC_SPACE_ENDPOINT",
] as const

const aiCatalogueMediaHostnameEnvKeys = [
  "AI_CATALOGUE_MEDIA_BASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "SERVICE_FQDN_STOREFRONT",
  "SERVICE_URL_STOREFRONT",
] as const

function toHostname(value: string | undefined): string | null {
  const trimmedValue = value?.trim()

  if (!trimmedValue) {
    return null
  }

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`,
    )

    return url.hostname.toLowerCase()
  } catch {
    return null
  }
}

function getUniqueHostnames(
  env: EnvRecord,
  keys: readonly string[],
): string[] {
  return Array.from(
    new Set(
      keys
        .map((key) => toHostname(env[key]))
        .filter((hostname): hostname is string => Boolean(hostname)),
    ),
  )
}

export function getAssetImageHostnames(
  env: EnvRecord = process.env,
): string[] {
  return getUniqueHostnames(env, assetImageHostnameEnvKeys)
}

export function getAiCatalogueRemotePatterns(
  env: EnvRecord = process.env,
): ImageRemotePattern[] {
  return getUniqueHostnames(env, aiCatalogueMediaHostnameEnvKeys).map(
    (hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/ai-catalogue/products/**",
    }),
  )
}
