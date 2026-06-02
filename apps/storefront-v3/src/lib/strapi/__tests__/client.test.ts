import { strapiClient } from "../client"

const mockFetch = jest.fn()

describe("strapiClient", () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 1 } }),
    })
    global.fetch = mockFetch
    strapiClient.baseUrl = "https://cms.example.com"
    strapiClient.token = undefined
  })

  it("does not combine no-store requests with default revalidation", async () => {
    await strapiClient.fetch("/homepage", {
      cache: "no-store",
      tags: ["homepage"],
    })

    expect(mockFetch).toHaveBeenCalledWith(
      "https://cms.example.com/api/homepage",
      expect.objectContaining({
        cache: "no-store",
        next: {
          tags: ["homepage"],
        },
      })
    )
  })
})
