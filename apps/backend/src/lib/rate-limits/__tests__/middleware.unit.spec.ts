import type { MedusaNextFunction } from "@medusajs/framework/http";

import {
  createRateLimitMiddleware,
  getClientIp,
  makeRateLimitKey,
  MemoryRateLimitStore,
} from "../middleware";

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  setHeader: jest.fn(),
});

describe("rate limit middleware", () => {
  it("allows requests until the endpoint bucket reaches its limit", async () => {
    const store = new MemoryRateLimitStore(() => 1_000);
    const middleware = createRateLimitMiddleware(
      {
        name: "store_search",
        limit: 2,
        windowMs: 60_000,
        key: ({ req }) => makeRateLimitKey("store_search", getClientIp(req)),
      },
      { store },
    );
    const req = { headers: { "x-forwarded-for": "203.0.113.10" } };
    const res = createResponse();
    const next = jest.fn() as MedusaNextFunction;

    await middleware(req as never, res as never, next);
    await middleware(req as never, res as never, next);
    await middleware(req as never, res as never, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "60");
    expect(res.json).toHaveBeenCalledWith({
      code: "rate_limited",
      message: "Too many requests. Please try again shortly.",
    });
  });

  it("isolates buckets by endpoint and client key", async () => {
    const store = new MemoryRateLimitStore(() => 1_000);
    const first = await store.consume("rate-limit:v1:search:203.0.113.10", {
      limit: 1,
      windowMs: 60_000,
    });
    const isolatedEndpoint = await store.consume(
      "rate-limit:v1:newsletter:203.0.113.10",
      {
        limit: 1,
        windowMs: 60_000,
      },
    );
    const isolatedClient = await store.consume(
      "rate-limit:v1:search:203.0.113.11",
      {
        limit: 1,
        windowMs: 60_000,
      },
    );

    expect(first.allowed).toBe(true);
    expect(isolatedEndpoint.allowed).toBe(true);
    expect(isolatedClient.allowed).toBe(true);
  });

  it("fails open and logs a warning when the backing store is unavailable", async () => {
    const store = {
      consume: jest.fn().mockRejectedValue(new Error("redis unavailable")),
    };
    const logger = { warn: jest.fn() };
    const middleware = createRateLimitMiddleware(
      {
        name: "store_support_ticket",
        limit: 1,
        windowMs: 60_000,
        key: () => "rate-limit:v1:store_support_ticket:203.0.113.10",
      },
      { logger, store },
    );
    const next = jest.fn() as MedusaNextFunction;

    await middleware({} as never, createResponse() as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "Rate limit skipped for store_support_ticket: redis unavailable",
    );
  });

  it("uses authenticated actor ids ahead of client IPs for account buckets", () => {
    expect(makeRateLimitKey("customer_email_change", "cus_123")).toBe(
      "rate-limit:v1:customer_email_change:cus_123",
    );
  });
});
