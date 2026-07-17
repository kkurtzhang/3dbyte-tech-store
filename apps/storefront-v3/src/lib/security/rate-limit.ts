import { isIP } from "node:net"

import Redis from "ioredis"

type RateLimitOptions = {
  limit: number
  windowMs: number
}

export type RateLimitResult = {
  allowed: boolean
  retryAfterMs: number
}

export type RateLimitStore = {
  consume: (key: string, options: RateLimitOptions) => Promise<RateLimitResult>
}

type CheckRateLimitOptions = {
  store?: RateLimitStore
}

const RATE_LIMIT_PREFIX = "storefront-rate-limit:v1"

const redisConsumeScript = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`

class RedisRateLimitStore implements RateLimitStore {
  readonly #client: Redis

  constructor(redisUrl: string) {
    this.#client = new Redis(redisUrl, {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    })
  }

  async consume(
    key: string,
    { limit, windowMs }: RateLimitOptions
  ): Promise<RateLimitResult> {
    const result = await this.#client.eval(
      redisConsumeScript,
      1,
      key,
      windowMs.toString()
    )
    const [rawCount, rawTtl] = Array.isArray(result)
      ? result
      : [limit + 1, windowMs]
    const count = Number(rawCount)
    const ttl = Number(rawTtl)
    const retryAfterMs = Number.isFinite(ttl) ? Math.max(0, ttl) : windowMs

    return {
      allowed: Number.isFinite(count) && count <= limit,
      retryAfterMs: count <= limit ? 0 : retryAfterMs,
    }
  }
}

let defaultStore: RateLimitStore | null = null

function getDefaultStore(): RateLimitStore {
  if (defaultStore) return defaultStore

  const redisUrl = process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error("REDIS_URL is required for storefront rate limiting")
  }

  defaultStore = new RedisRateLimitStore(redisUrl)
  return defaultStore
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  options: CheckRateLimitOptions = {}
): Promise<RateLimitResult> {
  try {
    const store = options.store ?? getDefaultStore()
    return await store.consume(`${RATE_LIMIT_PREFIX}:${key}`, {
      limit,
      windowMs,
    })
  } catch {
    console.warn("Storefront rate limit unavailable; rejecting protected request")
    return { allowed: false, retryAfterMs: windowMs }
  }
}

function parseTrustedProxyHops(value: string | undefined): number {
  const parsed = Number.parseInt(value || "", 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1
}

export function getClientIp(
  headers: Headers,
  trustedProxyHops = parseTrustedProxyHops(process.env.TRUSTED_PROXY_HOPS)
): string {
  const forwardedAddresses = (headers.get("x-forwarded-for") || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => isIP(value) !== 0)

  if (forwardedAddresses.length > 0) {
    const clientIndex = Math.max(
      0,
      forwardedAddresses.length - 1 - trustedProxyHops
    )
    return forwardedAddresses[clientIndex]
  }

  const realIp = headers.get("x-real-ip")?.trim()
  return realIp && isIP(realIp) !== 0 ? realIp : "unknown"
}
