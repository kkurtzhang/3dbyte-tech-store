jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      ({
        status: init?.status ?? 200,
        json: async () => body,
      }),
  },
}))

jest.mock("@/lib/medusa/base-url", () => ({
  resolveMedusaBaseUrl: () => "http://localhost:9100",
}))

const originalFetch = global.fetch
const originalPublishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const originalResponse = global.Response

class TestResponse {
  status: number
  headers: Headers
  private responseBody: BodyInit | null | undefined

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.status = init?.status ?? 200
    this.headers = new Headers(init?.headers)
    this.responseBody = body
  }

  async text() {
    return typeof this.responseBody === "string" ? this.responseBody : ""
  }
}

const { GET } = jest.requireActual("../route")

describe("GET /api/product-documents/:id/download", () => {
  beforeAll(() => {
    global.Response = TestResponse as unknown as typeof Response
  })

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_test"
    global.fetch = jest.fn()
  })

  afterAll(() => {
    global.Response = originalResponse
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = originalPublishableKey
    jest.clearAllMocks()
  })

  it("adds the publishable key and proxies the upstream file without exposing the storage URL", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: "pdf-bytes",
      headers: new Headers({
        "content-type": "application/pdf",
        "content-length": "9",
        "content-disposition": 'attachment; filename="manual.pdf"',
      }),
    })

    const response = await GET({} as Request, {
      params: Promise.resolve({ id: "doc_1" }),
    })

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:9100/store/product-documents/doc_1/download",
      expect.objectContaining({
        headers: { "x-publishable-api-key": "pk_test" },
        redirect: "follow",
      })
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("content-type")).toBe("application/pdf")
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="manual.pdf"',
    )
    await expect(response.text()).resolves.toBe("pdf-bytes")
  })

  it("falls back to a safe attachment disposition when upstream omits one", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: "file",
      headers: new Headers({ "content-type": "application/pdf" }),
    })

    const response = await GET({} as Request, {
      params: Promise.resolve({ id: 'doc_1/.."bad' }),
    })

    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="doc_1_.._bad.pdf"',
    )
  })
})
