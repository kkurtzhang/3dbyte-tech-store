type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

export function checkAccountSecurityRateLimit(
  customerId: string,
  operation: string,
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const key = `${customerId}:${operation}`;
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, entry.resetAt - now),
    };
  }

  buckets.set(key, {
    ...entry,
    count: entry.count + 1,
  });

  return { allowed: true, retryAfterMs: 0 };
}

export function clearAccountSecurityRateLimitBuckets(): void {
  buckets.clear();
}
