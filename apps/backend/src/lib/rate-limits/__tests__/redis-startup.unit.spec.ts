import { startRedisProtocolServer } from "../__fixtures__/redis-protocol-server";
import { createRateLimitMiddleware, RedisRateLimitStore } from "../middleware";

import type Redis from "ioredis";

const mockClients: Redis[] = [];
jest.mock("ioredis", () => {
  const ActualRedis =
    jest.requireActual<typeof import("ioredis")>("ioredis").default;
  return {
    __esModule: true,
    default: jest.fn((url: string, options: Redis["options"]) => {
      const client = new ActualRedis(url, options);
      client.on("error", () => {});
      mockClients.push(client);
      return client;
    }),
  };
});

describe("backend rate limiter Redis startup", () => {
  let fixture: Awaited<ReturnType<typeof startRedisProtocolServer>>;

  afterEach(async () => {
    mockClients.splice(0).forEach((client) => client.disconnect());
    await fixture?.close();
  });

  async function makeStore(stall = false) {
    fixture = await startRedisProtocolServer(stall);
    return new RedisRateLimitStore(fixture.url);
  }

  it("allows the first protected request while a fresh client connects", async () => {
    const store = await makeStore();
    await expect(
      store.consume("startup", { limit: 2, windowMs: 60_000 }),
    ).resolves.toMatchObject({ allowed: true, remaining: 1 });
  });

  it("counts concurrent startup requests and denies those over the limit", async () => {
    const store = await makeStore();
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        store.consume("startup", { limit: 2, windowMs: 60_000 }),
      ),
    );
    expect(results.map((result) => result.allowed)).toEqual([
      true,
      true,
      false,
    ]);
    expect(results[2].retryAfterMs).toBe(60_000);
  });

  it("returns 503 within the deadline when Redis accepts but never responds", async () => {
    const store = await makeStore(true);
    const middleware = createRateLimitMiddleware(
      {
        name: "internal_ai",
        limit: 2,
        windowMs: 60_000,
        key: () => "startup",
      },
      { store, logger: { warn: jest.fn() } },
    );
    const next = jest.fn();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    const started = Date.now();
    await middleware({} as never, response as never, next);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
    expect(Date.now() - started).toBeGreaterThanOrEqual(1_800);
    expect(Date.now() - started).toBeLessThan(3_500);
  });
});
