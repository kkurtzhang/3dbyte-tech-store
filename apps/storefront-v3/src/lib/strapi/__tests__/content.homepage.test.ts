import { getHomepage } from "../content"

jest.mock("../client", () => ({
  strapiClient: {
    fetch: jest.fn(),
  },
}))

const mockFetch = jest.requireMock("../client").strapiClient.fetch as jest.Mock

describe("strapi homepage content helpers", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it("fetches homepage content with a homepage tag for later invalidation", async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        id: 1,
      },
      meta: {},
    })

    await getHomepage()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/homepage?"),
      expect.objectContaining({
        tags: ["homepage"],
      })
    )
  })
})
