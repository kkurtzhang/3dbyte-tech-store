import {
  getHomepage,
  getGuidesPage,
  getHelpCenter,
} from "../content"

jest.mock("../client", () => ({
  strapiClient: {
    fetch: jest.fn(),
  },
}))

const mockFetch = jest.requireMock("../client").strapiClient.fetch as jest.Mock

describe("strapi single-type content helpers", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it("fetches the homepage single type without persistent cache", async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        id: 1,
        HeroBanner: {
          Headline: "Fresh CMS headline",
          Image: {
            id: 1,
            url: "/uploads/fresh-hero.png",
            width: 1200,
            height: 800,
          },
        },
      },
      meta: {},
    })

    const result = await getHomepage()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/homepage?"),
      expect.objectContaining({
        cache: "no-store",
      })
    )
    expect(mockFetch.mock.calls[0][0]).toContain(
      "populate[HeroBanner][populate][Image]=true"
    )
    expect(result.data.HeroBanner?.Headline).toBe("Fresh CMS headline")
  })

  it("fetches the help-center single type with nested category articles", async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        id: 1,
        Heading: "Customer Support Desk",
        Categories: [
          {
            id: 1,
            Title: "Warranty",
            Href: "/faq",
            Articles: [{ id: 1, Title: "What is covered?" }],
          },
        ],
      },
      meta: {},
    })

    const result = await getHelpCenter()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/help-center?"),
      expect.objectContaining({
        tags: ["help-center"],
      })
    )
    expect(mockFetch.mock.calls[0][0]).toContain(
      "populate[Categories][populate][Articles]=true"
    )
    expect(result.data.Heading).toBe("Customer Support Desk")
  })

  it("fetches the guides-page single type with nested guide links", async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        id: 1,
        Heading: "Builder Knowledge Base",
        Categories: [
          {
            id: 1,
            Title: "Calibration",
            Guides: [{ id: 1, Title: "First layer checklist", Href: "/blog/first-layer" }],
          },
        ],
      },
      meta: {},
    })

    const result = await getGuidesPage()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/guides-page?"),
      expect.objectContaining({
        tags: ["guides-page"],
      })
    )
    expect(mockFetch.mock.calls[0][0]).toContain(
      "populate[Categories][populate][Guides]=true"
    )
    expect(result.data.Heading).toBe("Builder Knowledge Base")
  })
})
