import { strapiClient } from "../client"

describe("strapiClient", () => {
  const originalFetch = global.fetch
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as jest.Mock
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    global.fetch = originalFetch
    jest.clearAllMocks()
  })

  it("disables fetch caching for CMS reads during development", async () => {
    process.env.NODE_ENV = "development"

    await strapiClient.fetch("/homepage")

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:1337/api/homepage",
      expect.objectContaining({
        next: expect.objectContaining({
          revalidate: 0,
        }),
      })
    )
  })

  it("keeps timed revalidation and tags for production CMS reads", async () => {
    process.env.NODE_ENV = "production"

    await strapiClient.fetch("/homepage", {
      tags: ["homepage"],
    })

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:1337/api/homepage",
      expect.objectContaining({
        next: expect.objectContaining({
          revalidate: 3600,
          tags: ["homepage"],
        }),
      })
    )
  })
})
