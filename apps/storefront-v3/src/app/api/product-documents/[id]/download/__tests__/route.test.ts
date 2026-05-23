jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      ({
        status: init?.status ?? 200,
        json: async () => body,
      }),
    redirect: (url: string, status = 307) => ({
      status,
      headers: new Headers({ location: url }),
    }),
  },
}))

jest.mock("@/lib/medusa/base-url", () => ({
  resolveMedusaBaseUrl: () => "http://localhost:9100",
}))

const originalFetch = global.fetch
const originalPublishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

const { GET } = jest.requireActual("../route")

describe("GET /api/product-documents/:id/download", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_test"
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = originalPublishableKey
    jest.clearAllMocks()
  })

  it("adds the publishable key and redirects to the backend download location", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 302,
      headers: new Headers({
        location: "https://s3.example.com/manual.pdf",
      }),
    })

    const response = await GET({} as Request, {
      params: Promise.resolve({ id: "doc_1" }),
    })

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:9100/store/product-documents/doc_1/download",
      expect.objectContaining({
        headers: { "x-publishable-api-key": "pk_test" },
        redirect: "manual",
      })
    )
    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("https://s3.example.com/manual.pdf")
  })
})
