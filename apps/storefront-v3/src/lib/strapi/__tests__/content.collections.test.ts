import {
  getCollectionDescriptionByHandle,
  getCollectionDescriptions,
} from "../content"

jest.mock("../client", () => ({
  strapiClient: {
    fetch: jest.fn(),
  },
}))

const mockFetch = jest.requireMock("../client").strapiClient.fetch as jest.Mock

describe("strapi collection content helpers", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it("fetches collection descriptions list", async () => {
    mockFetch.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          Handle: "voron",
          Title: "Voron",
          Description: "High-performance Voron ecosystem components.",
          Image: { id: 1, url: "https://example.com/voron.jpg", width: 1000, height: 1000 },
        },
      ],
      meta: {},
    })

    const result = await getCollectionDescriptions()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/collections?"),
      expect.objectContaining({
        tags: ["collections-content"],
      })
    )
    expect(result.data).toHaveLength(1)
    expect(result.data[0].Handle).toBe("voron")
  })

  it("returns first collection description by handle", async () => {
    mockFetch.mockResolvedValueOnce({
      data: [
        {
          id: 2,
          Handle: "voron",
          Title: "Voron Collection",
          Description: "Collection description",
        },
      ],
      meta: {},
    })

    const result = await getCollectionDescriptionByHandle("voron")

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/collections?"),
      expect.objectContaining({
        tags: ["collection-content-voron"],
      })
    )
    expect(result?.Handle).toBe("voron")
  })

  it("returns null when handle has no collection description", async () => {
    mockFetch.mockResolvedValueOnce({
      data: [],
      meta: {},
    })

    const result = await getCollectionDescriptionByHandle("missing")

    expect(result).toBeNull()
  })
})
