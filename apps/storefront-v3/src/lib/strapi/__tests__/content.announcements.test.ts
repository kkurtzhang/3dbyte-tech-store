import { getHomepageAnnouncements } from "../content"

jest.mock("../client", () => ({
  strapiClient: {
    fetch: jest.fn(),
  },
}))

const mockFetch = jest.requireMock("../client").strapiClient.fetch as jest.Mock

describe("strapi homepage announcement helpers", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it("fetches announcement bar items from homepage content", async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        id: 1,
        AnnouncementBarItems: [
          {
            id: 11,
            Text: "Free shipping over $149",
            Icon: "truck",
            Link: "/shipping",
          },
          {
            id: 12,
            Text: "New Voron kits in stock",
            Icon: "package",
            Link: "/collections/voron",
          },
        ],
      },
      meta: {},
    })

    const result = await getHomepageAnnouncements()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/homepage?"),
      expect.objectContaining({
        tags: ["homepage-announcements"],
      })
    )
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      Text: "Free shipping over $149",
      Icon: "truck",
    })
  })

  it("returns an empty list when homepage announcements are missing", async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        id: 1,
      },
      meta: {},
    })

    const result = await getHomepageAnnouncements()

    expect(result).toEqual([])
  })
})
