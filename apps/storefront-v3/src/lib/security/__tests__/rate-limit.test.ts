import {
  checkRateLimit,
  getClientIp,
  type RateLimitStore,
} from "../rate-limit"

describe("distributed storefront rate limiting", () => {
  it("awaits the atomic backing store result", async () => {
    const store: RateLimitStore = {
      consume: jest.fn().mockResolvedValue({
        allowed: true,
        retryAfterMs: 0,
      }),
    }

    await expect(
      checkRateLimit("support:203.0.113.10", 5, 60_000, { store })
    ).resolves.toEqual({ allowed: true, retryAfterMs: 0 })
    expect(store.consume).toHaveBeenCalledWith(
      "storefront-rate-limit:v1:support:203.0.113.10",
      { limit: 5, windowMs: 60_000 }
    )
  })

  it("fails closed when the shared store is unavailable", async () => {
    const store: RateLimitStore = {
      consume: jest.fn().mockRejectedValue(new Error("redis unavailable")),
    }

    await expect(
      checkRateLimit("assistant:203.0.113.10", 12, 60_000, { store })
    ).resolves.toEqual({ allowed: false, retryAfterMs: 60_000 })
  })

  it("selects the client address before the configured trusted proxy hops", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.1, 203.0.113.20, 10.0.0.4",
      "x-real-ip": "10.0.0.4",
    })

    expect(getClientIp(headers, 1)).toBe("203.0.113.20")
    expect(getClientIp(headers, 2)).toBe("198.51.100.1")
  })
})
