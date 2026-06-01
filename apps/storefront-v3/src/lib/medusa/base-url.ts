type MedusaUrlEnv = Record<string, string | undefined>
type BrowserLocation = Pick<Location, "hostname" | "protocol">

type ResolveMedusaBaseUrlOptions = {
  isServer?: boolean
  env?: MedusaUrlEnv
  location?: BrowserLocation
}

const DEFAULT_MEDUSA_BACKEND_URL = "http://localhost:9000"
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"])
const HOSTED_MEDUSA_API_HOSTS: Record<string, string> = {
  "store.staging.3dbytetech.com.au": "api.staging.3dbytetech.com.au",
  "store.3dbytetech.com.au": "api.3dbytetech.com.au",
}
const stripTrailingSlash = (value: string) => value.replace(/\/$/, "")

const getBrowserLocation = (location?: BrowserLocation) => {
  if (location) {
    return location
  }

  if (typeof window === "undefined") {
    return undefined
  }

  return window.location
}

const isLocalHostname = (hostname: string) =>
  LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost")

const inferPublicMedusaBaseUrl = (location?: BrowserLocation) => {
  const hostname = location?.hostname.toLowerCase()

  if (!hostname || isLocalHostname(hostname)) {
    return DEFAULT_MEDUSA_BACKEND_URL
  }

  const apiHostname = HOSTED_MEDUSA_API_HOSTS[hostname]

  if (!apiHostname) {
    return DEFAULT_MEDUSA_BACKEND_URL
  }

  return `https://${apiHostname}`
}

export function resolveMedusaBaseUrl({
  isServer = typeof window === "undefined",
  env = process.env,
  location,
}: ResolveMedusaBaseUrlOptions = {}) {
  if (isServer) {
    return stripTrailingSlash(
      env.MEDUSA_SERVER_BACKEND_URL ||
        env.MEDUSA_BACKEND_URL ||
        env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
        DEFAULT_MEDUSA_BACKEND_URL
    )
  }

  return stripTrailingSlash(
    env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      inferPublicMedusaBaseUrl(getBrowserLocation(location))
  )
}
