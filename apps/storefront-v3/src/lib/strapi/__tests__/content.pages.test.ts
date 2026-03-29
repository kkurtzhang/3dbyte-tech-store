import { getContentPage } from "../content"

jest.mock("../client", () => ({
  strapiClient: {
    fetch: jest.fn(),
  },
}))

const mockFetch = jest.requireMock("../client").strapiClient.fetch as jest.Mock

describe("strapi content page helpers", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it("fetches shipping content with a dedicated invalidation tag", async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        id: 1,
        PageContent: "Shipping content",
      },
      meta: {},
    })

    await getContentPage("shipping")

    expect(mockFetch).toHaveBeenCalledWith("/shipping", {
      tags: ["content-page-shipping"],
    })
  })

  it("fetches returns content with a dedicated invalidation tag", async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        id: 1,
        PageContent: "Returns content",
      },
      meta: {},
    })

    await getContentPage("returns")

    expect(mockFetch).toHaveBeenCalledWith("/returns", {
      tags: ["content-page-returns"],
    })
  })
})
