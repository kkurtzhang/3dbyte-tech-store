jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      ({
        status: init?.status ?? 200,
        json: async () => body,
      }),
  },
}))

jest.mock("@/lib/search/content", () => ({
  searchContent: jest.fn(),
}))

const { GET } = jest.requireActual("../route")
const { searchContent } = jest.requireMock("@/lib/search/content")

function createRequest(url: string) {
  return { nextUrl: new URL(url) } as any
}

describe("GET /api/content-search", () => {
  beforeEach(() => {
    searchContent.mockReset()
  })

  it("returns empty results when q is missing", async () => {
    const request = createRequest("http://localhost:3001/api/content-search?scope=help")

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ results: [] })
    expect(searchContent).not.toHaveBeenCalled()
  })

  it("returns 400 for invalid scope", async () => {
    const request = createRequest(
      "http://localhost:3001/api/content-search?q=voron&scope=unknown"
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("Invalid scope")
  })

  it("returns meilisearch-backed results for valid request", async () => {
    searchContent.mockResolvedValueOnce([
      {
        id: "blog:voron-build-guide",
        kind: "guide",
        title: "Voron Build Guide",
        snippet: "A practical step-by-step guide.",
        url: "/blog/voron-build-guide",
      },
    ])

    const request = createRequest(
      "http://localhost:3001/api/content-search?q=voron&scope=guides"
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(searchContent).toHaveBeenCalledWith("voron", "guides", 8)
    expect(body.results).toHaveLength(1)
  })

  it("returns 500 when service throws", async () => {
    searchContent.mockRejectedValueOnce(new Error("unexpected"))

    const request = createRequest(
      "http://localhost:3001/api/content-search?q=voron&scope=help"
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toContain("Failed to search content")
  })
})
