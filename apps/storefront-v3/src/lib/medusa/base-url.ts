type MedusaUrlEnv = Record<string, string | undefined>

type ResolveMedusaBaseUrlOptions = {
  isServer?: boolean
  env?: MedusaUrlEnv
}

const stripTrailingSlash = (value: string) => value.replace(/\/$/, "")

export function resolveMedusaBaseUrl({
  isServer = typeof window === "undefined",
  env = process.env,
}: ResolveMedusaBaseUrlOptions = {}) {
  if (isServer) {
    return stripTrailingSlash(
      env.MEDUSA_SERVER_BACKEND_URL ||
        env.MEDUSA_BACKEND_URL ||
        env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
        "http://localhost:9000"
    )
  }

  return stripTrailingSlash(
    env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  )
}
