import { buildHomepageViewModel, getHomepageImageProps } from "../homepage-content"
import type { HomepageData, StrapiImage } from "@/lib/strapi/types"

function createImage(overrides: Partial<StrapiImage> = {}): StrapiImage {
  return {
    id: 1,
    url: "/uploads/hero.jpg",
    alternativeText: "Hero visual",
    width: 1200,
    height: 900,
    ...overrides,
  }
}

describe("homepage content helpers", () => {
  it("falls back to default conversion-first sections when CMS data is missing", () => {
    const viewModel = buildHomepageViewModel(null)

    expect(viewModel.hero.Headline).toBe("Engineered for Precision.")
    expect(viewModel.collectionsSection.heading).toBe(
      "Shop the catalog by build focus."
    )
    expect(viewModel.productsSection.ctaLink).toBe("/shop")
    expect(viewModel.guidesHelpSection.cards).toHaveLength(3)
    expect(viewModel.supportStrip.enabled).toBe(true)
  })

  it("prefers CMS-managed homepage section content when present", () => {
    const viewModel = buildHomepageViewModel({
      id: 1,
      CollectionsSection: {
        id: 10,
        Eyebrow: "CURATED COLLECTIONS",
        Heading: "Start with the right rail.",
        Text: "Choose a collection first and reduce browsing entropy.",
        CTA: {
          id: 11,
          BtnText: "See collections",
          BtnLink: "/collections",
        },
        Enabled: true,
      },
      GuidesHelpSection: {
        id: 12,
        Heading: "Need help before checkout?",
        Cards: [
          {
            id: 13,
            Title: "Read the guides",
            Text: "Build help and setup notes.",
            LinkText: "Open guides",
            Link: "/guides",
            Icon: "book-open",
          },
        ],
      },
    } as HomepageData)

    expect(viewModel.collectionsSection.eyebrow).toBe("CURATED COLLECTIONS")
    expect(viewModel.collectionsSection.heading).toBe(
      "Start with the right rail."
    )
    expect(viewModel.guidesHelpSection.heading).toBe(
      "Need help before checkout?"
    )
    expect(viewModel.guidesHelpSection.cards[0]).toMatchObject({
      title: "Read the guides",
      link: "/guides",
      icon: "book-open",
    })
  })

  it("builds absolute Strapi image props from relative media URLs", () => {
    const imageProps = getHomepageImageProps(createImage())
    const expectedBaseUrl =
      process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"

    expect(imageProps?.src).toBe(`${expectedBaseUrl}/uploads/hero.jpg`)
    expect(imageProps?.alt).toBe("Hero visual")
  })

  it("passes through absolute Strapi image URLs unchanged", () => {
    const imageProps = getHomepageImageProps(
      createImage({
        url: "https://3dbyte-tech-dev-store-cms.s3.ap-southeast-2.amazonaws.com/hero.jpg",
      })
    )

    expect(imageProps?.src).toBe(
      "https://3dbyte-tech-dev-store-cms.s3.ap-southeast-2.amazonaws.com/hero.jpg"
    )
  })
})
