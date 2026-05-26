const mockCategoryList = jest.fn()
const mockCollectionList = jest.fn()
const mockBrandSearch = jest.fn()
const mockSearchIndex = jest.fn(() => ({
  search: mockBrandSearch,
}))

jest.mock("@/lib/medusa/client", () => ({
  sdk: {
    store: {
      category: {
        list: mockCategoryList,
      },
      collection: {
        list: mockCollectionList,
      },
    },
  },
}))

jest.mock("@/lib/search/client", () => ({
  INDEX_BRANDS: "stg_brands",
  searchClient: {
    index: mockSearchIndex,
  },
}))

const { getFacetLabels } = jest.requireActual("../facet-labels")

describe("getFacetLabels", () => {
  beforeEach(() => {
    mockCategoryList.mockReset()
    mockCollectionList.mockReset()
    mockBrandSearch.mockReset()
    mockSearchIndex.mockClear()
  })

  it("loads brand labels from the configured Meilisearch brand index", async () => {
    mockCategoryList.mockResolvedValueOnce({
      product_categories: [{ id: "pcat_1", name: "Filament" }],
    })
    mockCollectionList.mockResolvedValueOnce({
      collections: [{ id: "pcol_1", title: "AI Ready" }],
    })
    mockBrandSearch.mockResolvedValueOnce({
      hits: [{ id: "brand_1", name: "3D Byte" }],
    })

    const labels = await getFacetLabels()

    expect(mockSearchIndex).toHaveBeenCalledWith("stg_brands")
    expect(mockBrandSearch).toHaveBeenCalledWith("", {
      limit: 1000,
      attributesToRetrieve: ["id", "name"],
    })
    expect(labels).toEqual({
      categories: { pcat_1: "Filament" },
      collections: { pcol_1: "AI Ready" },
      brands: { brand_1: "3D Byte" },
    })
  })
})
