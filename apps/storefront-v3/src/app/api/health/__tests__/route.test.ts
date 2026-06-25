jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      ({
        status: init?.status ?? 200,
        json: async () => body,
      }),
  },
}))

const { dynamic, GET } = jest.requireActual("../route")

describe("GET /api/health", () => {
  const originalReleaseSha = process.env.STOREFRONT_RELEASE_SHA

  afterEach(() => {
    if (originalReleaseSha === undefined) {
      delete process.env.STOREFRONT_RELEASE_SHA
      return
    }

    process.env.STOREFRONT_RELEASE_SHA = originalReleaseSha
  })

  it("returns a dependency-free storefront health response", async () => {
    process.env.STOREFRONT_RELEASE_SHA = "release-123"
    const response = await GET()
    const body = await response.json()

    expect(dynamic).toBe("force-dynamic")
    expect(response.status).toBe(200)
    expect(body).toEqual({
      releaseSha: "release-123",
      service: "storefront",
      status: "ok",
    })
  })

  it("uses unknown when runtime release identity is unavailable", async () => {
    delete process.env.STOREFRONT_RELEASE_SHA

    const response = await GET()

    await expect(response.json()).resolves.toEqual({
      releaseSha: "unknown",
      service: "storefront",
      status: "ok",
    })
  })
})
