import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import Redis from "ioredis";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number;
  resetAt: number;
};

export type RateLimitStore = {
  consume: (key: string, options: RateLimitOptions) => Promise<RateLimitResult>;
};

type RateLimitLogger = {
  warn: (message: string) => void;
};

export type RateLimitRule = RateLimitOptions & {
  name: string;
  message?: string;
  key: (context: {
    actorId?: string;
    clientIp: string;
    req: MedusaRequest;
  }) => string | null;
};

type RequestWithHeaders = MedusaRequest & {
  get?: (name: string) => string | undefined;
  headers?: Headers | Record<string, string | string[] | undefined>;
  auth_context?: {
    actor_id?: string;
    auth_identity_id?: string;
  };
};

type RateLimitMiddleware = ((
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) => Promise<void>) & {
  rateLimitRuleName?: string;
};

type MemoryEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_PREFIX = "rate-limit:v1";

const redisConsumeScript = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  return { current, tonumber(ARGV[1]) }
end
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`;

const defaultLogger: RateLimitLogger = {
  warn: (message) => console.warn(message),
};

export function makeRateLimitKey(name: string, identifier: string): string {
  return `${RATE_LIMIT_PREFIX}:${name}:${encodeURIComponent(identifier || "unknown")}`;
}

function buildResult(
  count: number,
  ttlMs: number,
  { limit }: RateLimitOptions,
): RateLimitResult {
  const retryAfterMs = Math.max(0, ttlMs);

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterMs: count <= limit ? 0 : retryAfterMs,
    resetAt: Date.now() + retryAfterMs,
  };
}

function getRequestHeader(req: MedusaRequest, name: string): string {
  const request = req as RequestWithHeaders;
  const directHeader = request.get?.(name);

  if (directHeader) return directHeader;

  if (request.headers instanceof Headers) {
    return request.headers.get(name) ?? "";
  }

  const lowerName = name.toLowerCase();
  const value = request.headers?.[lowerName] ?? request.headers?.[name];

  if (Array.isArray(value)) return value[0] ?? "";

  return value ?? "";
}

export function getClientIp(req: MedusaRequest): string {
  return (
    getRequestHeader(req, "x-forwarded-for").split(",")[0]?.trim() ||
    getRequestHeader(req, "x-real-ip") ||
    "unknown"
  );
}

export function getActorId(req: MedusaRequest): string | undefined {
  const authContext = (req as RequestWithHeaders).auth_context;

  return authContext?.actor_id || authContext?.auth_identity_id;
}

export class MemoryRateLimitStore implements RateLimitStore {
  readonly #buckets = new Map<string, MemoryEntry>();
  readonly #now: () => number;

  constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  async consume(
    key: string,
    options: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const now = this.#now();
    const entry = this.#buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      this.#buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });

      return buildResult(1, options.windowMs, options);
    }

    const nextCount = entry.count + 1;
    this.#buckets.set(key, {
      ...entry,
      count: nextCount,
    });

    return buildResult(nextCount, entry.resetAt - now, options);
  }
}

export class RedisRateLimitStore implements RateLimitStore {
  readonly #client: Redis;

  constructor(redisUrl: string) {
    this.#client = new Redis(redisUrl, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
  }

  async consume(
    key: string,
    options: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const result = await this.#client.eval(
      redisConsumeScript,
      1,
      key,
      options.windowMs.toString(),
    );
    const [rawCount, rawTtl] = Array.isArray(result)
      ? result
      : [0, options.windowMs];
    const count = Number(rawCount);
    const ttlMs = Number(rawTtl);

    return buildResult(
      Number.isFinite(count) ? count : options.limit + 1,
      Number.isFinite(ttlMs) ? ttlMs : options.windowMs,
      options,
    );
  }
}

let defaultStore: RateLimitStore | null = null;

export function getDefaultRateLimitStore(): RateLimitStore {
  if (defaultStore) return defaultStore;

  const redisUrl = process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL;
  defaultStore = redisUrl
    ? new RedisRateLimitStore(redisUrl)
    : new MemoryRateLimitStore();

  return defaultStore;
}

export function resetDefaultRateLimitStore(): void {
  defaultStore = null;
}

function setRateLimitHeaders(
  res: MedusaResponse,
  result: RateLimitResult,
): void {
  res.setHeader?.("RateLimit-Limit", result.limit.toString());
  res.setHeader?.("RateLimit-Remaining", result.remaining.toString());
  res.setHeader?.(
    "RateLimit-Reset",
    Math.ceil(result.resetAt / 1000).toString(),
  );

  if (!result.allowed) {
    res.setHeader?.(
      "Retry-After",
      Math.ceil(result.retryAfterMs / 1000).toString(),
    );
  }
}

export function createRateLimitMiddleware(
  rule: RateLimitRule,
  options: {
    logger?: RateLimitLogger;
    store?: RateLimitStore;
  } = {},
): RateLimitMiddleware {
  const middleware: RateLimitMiddleware = async (req, res, next) => {
    const key = rule.key({
      actorId: getActorId(req),
      clientIp: getClientIp(req),
      req,
    });

    if (!key) {
      next();
      return;
    }

    try {
      const store = options.store ?? getDefaultRateLimitStore();
      const result = await store.consume(key, {
        limit: rule.limit,
        windowMs: rule.windowMs,
      });

      setRateLimitHeaders(res, result);

      if (!result.allowed) {
        res.status(429).json({
          code: "rate_limited",
          message:
            rule.message ?? "Too many requests. Please try again shortly.",
        });
        return;
      }
    } catch (error) {
      const logger = options.logger ?? defaultLogger;
      const message = error instanceof Error ? error.message : "unknown error";
      logger.warn(`Rate limit skipped for ${rule.name}: ${message}`);
    }

    next();
  };

  middleware.rateLimitRuleName = rule.name;

  return middleware;
}
