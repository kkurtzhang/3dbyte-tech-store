type Entry = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Entry>()

export function checkSupportTicketRateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfterMs: entry.resetAt - now }
  }

  buckets.set(key, { ...entry, count: entry.count + 1 })
  return { allowed: true, retryAfterMs: 0 }
}

export function clearSupportTicketRateLimitBuckets() {
  buckets.clear()
}
