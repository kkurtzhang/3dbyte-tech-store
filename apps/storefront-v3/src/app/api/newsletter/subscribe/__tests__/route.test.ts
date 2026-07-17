jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

import { POST } from "../route"

jest.mock("@/lib/medusa/base-url", () => ({
  resolveMedusaBaseUrl: () => "https://api.example.com",
}))

jest.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, retryAfterMs: 0 }),
  getClientIp: () => "203.0.113.10",
}))

describe("newsletter subscribe route", () => {
  const originalPublishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_test"
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ success: true }),
    })
  })

  afterEach(() => {
    if (originalPublishableKey) {
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = originalPublishableKey
    } else {
      delete process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    }
  })

  it("forwards the Medusa publishable key to the backend newsletter endpoint", async () => {
    const request = {
      headers: {
        get: (key: string) =>
          key.toLowerCase() === "x-forwarded-for" ? "203.0.113.10" : null,
      },
      json: async () => ({ email: "maker@example.com" }),
    }

    await POST(request as never)

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/store/newsletter/subscribe",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-forwarded-for": "203.0.113.10",
          "x-publishable-api-key": "pk_test",
        }),
      })
    )
  })
})
