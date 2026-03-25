import { renderHook, waitFor } from "@testing-library/react"
import { useFacetLabels } from "../use-facet-labels"

const mockCategoryList = jest.fn()
const mockCollectionList = jest.fn()
const mockBrandSearch = jest.fn()

jest.mock("@/lib/medusa/client", () => ({
  sdk: {
    store: {
      category: { list: (...args: unknown[]) => mockCategoryList(...args) },
      collection: { list: (...args: unknown[]) => mockCollectionList(...args) },
    },
  },
}))

jest.mock("@/lib/search/client", () => ({
  searchClient: {
    index: () => ({
      search: (...args: unknown[]) => mockBrandSearch(...args),
    }),
  },
}))

describe("useFacetLabels", () => {
  beforeEach(() => {
    mockCategoryList.mockReset()
    mockCollectionList.mockReset()
    mockBrandSearch.mockReset()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        categories: { cat_1: "Hotends" },
        brands: { brand_1: "E3D" },
        collections: { col_1: "Printer Parts" },
      }),
    }) as jest.Mock
  })

  it("loads facet labels from the internal API route", async () => {
    const { result } = renderHook(() => useFacetLabels())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(global.fetch).toHaveBeenCalledWith("/api/filter-labels")
    expect(result.current.labels).toEqual({
      categories: { cat_1: "Hotends" },
      brands: { brand_1: "E3D" },
      collections: { col_1: "Printer Parts" },
    })
    expect(mockCategoryList).not.toHaveBeenCalled()
    expect(mockCollectionList).not.toHaveBeenCalled()
    expect(mockBrandSearch).not.toHaveBeenCalled()
  })
})
