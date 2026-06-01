import {
  buildRootMetadata,
  buildRobotsDirective,
  getSiteUrl,
  isIndexableSiteUrl,
} from "../site-metadata"

describe("site metadata", () => {
  it("marks staging storefront URLs as noindex while keeping them crawlable", () => {
    const siteUrl = "https://store.staging.3dbytetech.com.au"

    expect(isIndexableSiteUrl(siteUrl)).toBe(false)
    expect(buildRobotsDirective(siteUrl)).toEqual({
      follow: false,
      googleBot: {
        follow: false,
        index: false,
        noimageindex: true,
      },
      index: false,
    })
  })

  it("only opts the production storefront host into indexing", () => {
    expect(isIndexableSiteUrl("https://store.3dbytetech.com.au")).toBe(true)
    expect(isIndexableSiteUrl("https://preview.3dbytetech.com.au")).toBe(false)
    expect(isIndexableSiteUrl("http://localhost:3001")).toBe(false)
  })

  it("uses the public site URL for metadataBase and social URLs", () => {
    const metadata = buildRootMetadata({
      NEXT_PUBLIC_SITE_URL: "https://store.staging.3dbytetech.com.au/",
    })

    expect(metadata.metadataBase?.toString()).toBe(
      "https://store.staging.3dbytetech.com.au/"
    )
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        siteName: "3D Byte Tech Store",
        type: "website",
        url: "/",
      })
    )
    expect(metadata.twitter).toEqual(
      expect.objectContaining({
        card: "summary_large_image",
        title: "3D Byte Tech Store - Premium 3D Printing Supplies",
      })
    )
    expect(metadata.robots).toEqual(buildRobotsDirective(getSiteUrl({
      NEXT_PUBLIC_SITE_URL: "https://store.staging.3dbytetech.com.au/",
    })))
  })
})
