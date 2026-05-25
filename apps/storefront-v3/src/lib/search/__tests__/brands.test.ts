import { searchBrands } from "../brands"

jest.mock("../client", () => {
  const searchMock = jest.fn()
  const indexMock = jest.fn(() => ({
    search: searchMock,
  }))

  return {
    searchClient: {
      index: indexMock,
    },
    INDEX_BRANDS: "brands",
    INDEX_PRODUCTS: "products",
    __mockSearch: searchMock,
    __mockIndex: indexMock,
  }
})

const mockClient = jest.requireMock("../client")

const originalWarn = console.warn

beforeAll(() => {
  console.warn = jest.fn()
})

afterAll(() => {
  console.warn = originalWarn
})

beforeEach(() => {
  mockClient.__mockSearch.mockReset()
  mockClient.__mockIndex.mockClear()
})

describe("searchBrands", () => {
  it("returns brand hits from Meilisearch", async () => {
    mockClient.__mockSearch.mockResolvedValueOnce({
      hits: [
        {
          id: "brand_1",
          name: "Polymaker",
          handle: "polymaker",
          description: "Filament and materials",
        },
      ],
      estimatedTotalHits: 1,
    })

    const result = await searchBrands({ limit: 10 })

    expect(mockClient.__mockIndex).toHaveBeenCalledWith("brands")
    expect(mockClient.__mockSearch).toHaveBeenCalledWith("", {
      limit: 10,
      offset: 0,
    })
    expect(result).toEqual({
      hits: [
        {
          id: "brand_1",
          name: "Polymaker",
          handle: "polymaker",
          description: "Filament and materials",
        },
      ],
      count: 1,
    })
  })

  it("returns an empty result when Meilisearch is unavailable during rendering", async () => {
    const error = new Error("invalid_api_key")
    mockClient.__mockSearch.mockRejectedValueOnce(error)

    const result = await searchBrands({ limit: 100 })

    expect(result).toEqual({ hits: [], count: 0 })
    expect(console.warn).toHaveBeenCalledWith(
      "Failed to fetch brands from Meilisearch",
      error
    )
  })
})
