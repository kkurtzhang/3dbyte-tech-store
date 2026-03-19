import {
  buildCollectionCardData,
  buildCollectionContentByHandle,
} from "../collection-cards"

describe("collection card helpers", () => {
  const originalStrapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL

  afterEach(() => {
    if (originalStrapiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_STRAPI_URL
      return
    }

    process.env.NEXT_PUBLIC_STRAPI_URL = originalStrapiUrl
  })

  it("indexes CMS content by lower-cased handle", () => {
    const contentByHandle = buildCollectionContentByHandle([
      {
        id: 1,
        documentId: "doc_1",
        Handle: "Voron",
        Title: "Voron",
        Description: "Voron parts and kits",
      },
    ])

    expect(contentByHandle.get("voron")?.Title).toBe("Voron")
  })

  it("prefers CMS title, description, and image when available", () => {
    process.env.NEXT_PUBLIC_STRAPI_URL = "https://cms.example.com"

    const cards = buildCollectionCardData(
      [
        {
          id: "col_1",
          handle: "voron",
          title: "Voron Collection",
          metadata: {
            image: "https://store.example.com/voron-fallback.jpg",
            product_count: 12,
          },
        },
      ],
      buildCollectionContentByHandle([
        {
          id: 1,
          documentId: "doc_1",
          Handle: "VORON",
          Title: "Voron Upgrades",
          Description: "Precision components for Voron builders.",
          Image: {
            id: 99,
            url: "/uploads/voron.jpg",
            width: 1200,
            height: 900,
          },
        },
      ])
    )

    expect(cards).toEqual([
      expect.objectContaining({
        href: "/collections/voron",
        title: "Voron Upgrades",
        description: "Precision components for Voron builders.",
        imageUrl: "https://cms.example.com/uploads/voron.jpg",
      }),
    ])
  })

  it("falls back to Medusa collection data when CMS content is missing", () => {
    const cards = buildCollectionCardData(
      [
        {
          id: "col_2",
          handle: "filament",
          title: "Filament",
          metadata: {
            image: "https://store.example.com/filament.jpg",
            product_count: 8,
          },
        },
        {
          id: "col_3",
          handle: "printer-parts",
          title: "Printer Parts",
        },
      ],
      new Map()
    )

    expect(cards[0]).toEqual(
      expect.objectContaining({
        title: "Filament",
        description: "8 products",
        imageUrl: "https://store.example.com/filament.jpg",
      })
    )
    expect(cards[1]).toEqual(
      expect.objectContaining({
        title: "Printer Parts",
        description: "Explore this collection",
      })
    )
  })
})
