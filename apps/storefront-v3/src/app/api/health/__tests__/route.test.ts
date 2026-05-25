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
  it("returns a dependency-free storefront health response", async () => {
    const response = await GET()
    const body = await response.json()

    expect(dynamic).toBe("force-dynamic")
    expect(response.status).toBe(200)
    expect(body).toEqual({
      service: "storefront",
      status: "ok",
    })
  })
})
