import { startRedisProtocolServer } from "./redis-protocol-server";

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

describe("storefront rate limiter Redis startup", () => {
  let fixture: Awaited<ReturnType<typeof startRedisProtocolServer>>;
  const originalUrl = process.env.RATE_LIMIT_REDIS_URL;

  afterEach(async () => {
    mockClients.splice(0).forEach((client) => client.disconnect());
    await fixture?.close();
    if (originalUrl === undefined) delete process.env.RATE_LIMIT_REDIS_URL;
    else process.env.RATE_LIMIT_REDIS_URL = originalUrl;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  async function checkWithRedis(stall = false) {
    fixture = await startRedisProtocolServer(stall);
    process.env.RATE_LIMIT_REDIS_URL = fixture.url;
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const { checkRateLimit } = await import("../rate-limit");
    return () => checkRateLimit("assistant:startup", 2, 60_000);
  }

  it("allows the first protected request while a fresh client connects", async () => {
    const consume = await checkWithRedis();
    await expect(consume()).resolves.toEqual({
      allowed: true,
      retryAfterMs: 0,
    });
  });

  it("counts concurrent startup requests and denies those over the limit", async () => {
    const consume = await checkWithRedis();
    const results = await Promise.all([consume(), consume(), consume()]);
    expect(results.map((result) => result.allowed)).toEqual([
      true,
      true,
      false,
    ]);
    expect(results[2].retryAfterMs).toBe(60_000);
  });

  it("fails closed within the deadline when Redis accepts but never responds", async () => {
    const consume = await checkWithRedis(true);
    const started = Date.now();
    await expect(consume()).resolves.toEqual({
      allowed: false,
      retryAfterMs: 60_000,
    });
    expect(Date.now() - started).toBeGreaterThanOrEqual(1_800);
    expect(Date.now() - started).toBeLessThan(3_500);
  });
});
