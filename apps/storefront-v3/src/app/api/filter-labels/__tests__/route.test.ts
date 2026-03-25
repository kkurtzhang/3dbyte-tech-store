jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      ({
        status: init?.status ?? 200,
        json: async () => body,
      }),
  },
}))

jest.mock("@/lib/filters/facet-labels", () => ({
  getFacetLabels: jest.fn(),
}))

const { GET } = jest.requireActual("../route")
const { getFacetLabels } = jest.requireMock("@/lib/filters/facet-labels")

describe("GET /api/filter-labels", () => {
  beforeEach(() => {
    getFacetLabels.mockReset()
  })

  it("returns facet labels", async () => {
    getFacetLabels.mockResolvedValueOnce({
      categories: { cat_1: "Hotends" },
      brands: { brand_1: "E3D" },
      collections: { col_1: "Printer Parts" },
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      categories: { cat_1: "Hotends" },
      brands: { brand_1: "E3D" },
      collections: { col_1: "Printer Parts" },
    })
  })

  it("returns 500 when loading labels fails", async () => {
    getFacetLabels.mockRejectedValueOnce(new Error("boom"))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: "Failed to load facet labels." })
  })
})
