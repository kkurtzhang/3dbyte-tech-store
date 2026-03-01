import { searchContent } from "../content"

jest.mock("../client", () => {
  const searchMock = jest.fn()
  const indexMock = jest.fn((indexUid: string) => ({
    search: (query: string, options?: Record<string, unknown>) =>
      searchMock(indexUid, query, options),
  }))

  return {
    searchClient: {
      index: indexMock,
    },
    INDEX_PRODUCTS: "products",
    __mockSearch: searchMock,
    __mockIndex: indexMock,
  }
})

const mockClient = jest.requireMock("../client")

describe("searchContent", () => {
  beforeEach(() => {
    mockClient.__mockSearch.mockReset()
    mockClient.__mockIndex.mockClear()
  })

  it("returns empty results for blank query", async () => {
    const result = await searchContent("   ", "help")

    expect(result).toEqual([])
    expect(mockClient.__mockIndex).not.toHaveBeenCalled()
  })

  it("searches blog index for guides scope", async () => {
    mockClient.__mockSearch.mockImplementation((indexUid: string) => {
      if (indexUid === "blog") {
        return Promise.resolve({
          hits: [
            {
              id: 1,
              Title: "Voron Build Guide",
              Slug: "voron-build-guide",
              Excerpt: "A practical step-by-step guide.",
            },
          ],
        })
      }

      return Promise.resolve({ hits: [] })
    })

    const result = await searchContent("voron", "guides", 5)

    expect(mockClient.__mockSearch).toHaveBeenCalledWith(
      "blog",
      "voron",
      expect.objectContaining({ limit: 5 })
    )

    expect(result).toEqual([
      {
        id: "blog:voron-build-guide",
        kind: "guide",
        title: "Voron Build Guide",
        snippet: "A practical step-by-step guide.",
        url: "/blog/voron-build-guide",
      },
    ])
  })

  it("searches blog and product indexes for help scope", async () => {
    mockClient.__mockSearch.mockImplementation((indexUid: string) => {
      if (indexUid === "blog") {
        return Promise.resolve({
          hits: [
            {
              id: 2,
              Title: "Troubleshooting Stringing",
              Slug: "troubleshooting-stringing",
              Excerpt: "Fixing stringing and oozing.",
            },
          ],
        })
      }

      if (indexUid === "products") {
        return Promise.resolve({
          hits: [
            {
              id: "prod_1",
              title: "Nozzle Cleaning Kit",
              handle: "nozzle-cleaning-kit",
              categories: ["Maintenance"],
            },
          ],
        })
      }

      return Promise.resolve({ hits: [] })
    })

    const result = await searchContent("nozzle", "help", 8)

    expect(mockClient.__mockSearch).toHaveBeenCalledWith(
      "blog",
      "nozzle",
      expect.objectContaining({ limit: 8 })
    )
    expect(mockClient.__mockSearch).toHaveBeenCalledWith(
      "products",
      "nozzle",
      expect.objectContaining({ limit: 8 })
    )

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "article",
          title: "Troubleshooting Stringing",
          url: "/blog/troubleshooting-stringing",
        }),
        expect.objectContaining({
          kind: "product",
          title: "Nozzle Cleaning Kit",
          url: "/products/nozzle-cleaning-kit",
        }),
      ])
    )
  })

  it("returns partial results when one index query fails", async () => {
    mockClient.__mockSearch.mockImplementation((indexUid: string) => {
      if (indexUid === "blog") {
        return Promise.reject(new Error("index_not_found"))
      }

      if (indexUid === "products") {
        return Promise.resolve({
          hits: [
            {
              id: "prod_2",
              title: "PTFE Tube",
              handle: "ptfe-tube",
            },
          ],
        })
      }

      return Promise.resolve({ hits: [] })
    })

    const result = await searchContent("tube", "help")

    expect(result).toEqual([
      {
        id: "product:prod_2",
        kind: "product",
        title: "PTFE Tube",
        snippet: "",
        url: "/products/ptfe-tube",
      },
    ])
  })
})
