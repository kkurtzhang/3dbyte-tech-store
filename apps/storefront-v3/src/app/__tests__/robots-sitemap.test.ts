const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

async function loadRobots(siteUrl: string) {
  jest.resetModules()
  process.env.NEXT_PUBLIC_SITE_URL = siteUrl

  const module = await import("../robots")

  return module.default()
}

async function loadSitemap(siteUrl: string) {
  jest.resetModules()
  process.env.NEXT_PUBLIC_SITE_URL = siteUrl
  jest.doMock("@/lib/medusa/products", () => ({
    getProductHandles: jest.fn().mockResolvedValue(["petg-black"]),
  }))
  jest.doMock("@/lib/medusa/collections", () => ({
    getCollections: jest.fn().mockResolvedValue([{ handle: "filament" }]),
  }))

  const module = await import("../sitemap")

  return module.default()
}

describe("robots and sitemap indexing controls", () => {
  afterEach(() => {
    jest.resetModules()
    jest.dontMock("@/lib/medusa/products")
    jest.dontMock("@/lib/medusa/collections")
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
  })

  it("keeps staging crawlable for noindex discovery but removes sitemap hints", async () => {
    const robots = await loadRobots(
      "https://store.staging.3dbytetech.com.au"
    )
    const sitemap = await loadSitemap(
      "https://store.staging.3dbytetech.com.au"
    )

    expect(robots.rules).toEqual({
      allow: "/",
      userAgent: "*",
    })
    expect(robots).not.toHaveProperty("sitemap")
    expect(sitemap).toEqual([])
  })

  it("keeps the production sitemap indexable", async () => {
    const robots = await loadRobots("https://store.3dbytetech.com.au")
    const sitemap = await loadSitemap("https://store.3dbytetech.com.au")

    expect(robots.sitemap).toBe(
      "https://store.3dbytetech.com.au/sitemap.xml"
    )
    expect(sitemap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "https://store.3dbytetech.com.au/shop",
        }),
        expect.objectContaining({
          url: "https://store.3dbytetech.com.au/products/petg-black",
        }),
      ])
    )
  })
})
