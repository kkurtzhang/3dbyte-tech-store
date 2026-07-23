jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      ({
        status: init?.status ?? 200,
        json: async () => body,
      }),
  },
}))

jest.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, retryAfterMs: 0 }),
  getClientIp: () => "203.0.113.10",
}))

const { POST } = jest.requireActual("../route")

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

function createRequest(body: Record<string, unknown>) {
  return {
    headers: {
      get: jest.fn(() => "203.0.113.10"),
    },
    json: jest.fn(async () => body),
  } as never
}

describe("POST /api/support-tickets", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.MEDUSA_BACKEND_URL = "http://localhost:9000"
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_test"
  })

  it("proxies support ticket requests to the Medusa backend", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ticket: {
          id: "spt_1",
          ticket_number: "3DBS-ABCD-234567",
          status: "new",
        },
      }),
    })

    const response = await POST(
      createRequest({
        name: "Ava Customer",
        email: "ava@example.com",
        subject: "Order Status",
        category: "order_status",
        message: "Can you check this order?",
        source: "contact_form",
      })
    )

    await expect(response.json()).resolves.toEqual({
      ticket: {
        id: "spt_1",
        ticket_number: "3DBS-ABCD-234567",
        status: "new",
      },
    })
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:9000/store/support-tickets",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-publishable-api-key": "pk_test",
        }),
      })
    )
  })
})
