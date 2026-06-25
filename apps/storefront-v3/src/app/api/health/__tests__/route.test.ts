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
  const originalSourceCommit = process.env.SOURCE_COMMIT
  const originalGithubSha = process.env.GITHUB_SHA

  afterEach(() => {
    if (originalReleaseSha === undefined) {
      delete process.env.STOREFRONT_RELEASE_SHA
    } else {
      process.env.STOREFRONT_RELEASE_SHA = originalReleaseSha
    }

    if (originalSourceCommit === undefined) {
      delete process.env.SOURCE_COMMIT
    } else {
      process.env.SOURCE_COMMIT = originalSourceCommit
    }

    if (originalGithubSha === undefined) {
      delete process.env.GITHUB_SHA
    } else {
      process.env.GITHUB_SHA = originalGithubSha
    }
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
    delete process.env.SOURCE_COMMIT
    delete process.env.GITHUB_SHA

    const response = await GET()

    await expect(response.json()).resolves.toEqual({
      releaseSha: "unknown",
      service: "storefront",
      status: "ok",
    })
  })

  it("falls back to SOURCE_COMMIT when the Coolify app variable is unavailable", async () => {
    process.env.STOREFRONT_RELEASE_SHA = "unknown"
    process.env.SOURCE_COMMIT = "6eb0ca392bd00a3a1dcb9ac59485c0902f6c6f63"

    const response = await GET()

    await expect(response.json()).resolves.toEqual({
      releaseSha: "6eb0ca392bd00a3a1dcb9ac59485c0902f6c6f63",
      service: "storefront",
      status: "ok",
    })
  })
})
