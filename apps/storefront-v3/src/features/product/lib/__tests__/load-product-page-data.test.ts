import { loadProductPageData } from "../load-product-page-data"
import { getProductReadByHandle } from "@/lib/medusa/products"
import { getStrapiContent } from "@/lib/strapi/content"
import { getPublicProductDocuments } from "@/lib/product-documents/api"

jest.mock("@/lib/medusa/products", () => ({
  getProductReadByHandle: jest.fn(),
}))

jest.mock("@/lib/medusa/bundles", () => ({
  getAvailableInBundleProducts: jest.fn().mockResolvedValue([]),
  getProductCurrencyCode: jest.fn(() => "aud"),
  getBundleLink: jest.fn(() => null),
  getBundleProduct: jest.fn(),
}))

jest.mock("@/lib/strapi/content", () => ({
  getStrapiContent: jest.fn(),
}))

jest.mock("@/lib/product-documents/api", () => ({
  getPublicProductDocuments: jest.fn(),
}))

const mockGetProductReadByHandle = getProductReadByHandle as jest.MockedFunction<
  typeof getProductReadByHandle
>
const mockGetStrapiContent = getStrapiContent as jest.MockedFunction<
  typeof getStrapiContent
>
const mockGetPublicProductDocuments =
  getPublicProductDocuments as jest.MockedFunction<
    typeof getPublicProductDocuments
  >

describe("loadProductPageData", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPublicProductDocuments.mockResolvedValue([])
  })

  it("loads Strapi rich product descriptions by the storefront product handle", async () => {
    mockGetProductReadByHandle.mockResolvedValue({
      status: "live",
      product: {
        id: "prod_1",
        handle: "ai-petg-black-175-1kg",
        title: "AI PETG Black 1.75mm 1kg",
        variants: [],
      } as never,
    })
    mockGetStrapiContent.mockResolvedValue({
      data: [
        {
          documentId: "desc_1",
          medusa_product_id: "prod_1",
          product_handle: "ai-petg-black-175-1kg",
          rich_description: "<p>AI-ready PETG guidance from Strapi.</p>",
        },
      ],
      meta: {},
    } as never)

    const pageData = await loadProductPageData("ai-petg-black-175-1kg")

    expect(mockGetStrapiContent).toHaveBeenCalledWith(
      "product-descriptions",
      expect.objectContaining({
        filters: {
          product_handle: {
            $eq: "ai-petg-black-175-1kg",
          },
        },
        pagination: {
          page: 1,
          pageSize: 1,
        },
      })
    )
    expect(pageData?.richDescription).toBe(
      "<p>AI-ready PETG guidance from Strapi.</p>"
    )
    expect(pageData?.contentStatus).toBe("found")
  })

  it("distinguishes missing enrichment from a CMS outage", async () => {
    mockGetProductReadByHandle.mockResolvedValue({
      status: "live",
      product: {
        id: "prod_missing_content",
        handle: "missing-content",
        title: "Product without enrichment",
        variants: [],
      } as never,
    })
    mockGetStrapiContent.mockResolvedValue({ data: [], meta: {} } as never)

    const missing = await loadProductPageData("missing-content")
    expect(missing?.contentStatus).toBe("missing")

    mockGetProductReadByHandle.mockResolvedValue({
      status: "live",
      product: {
        id: "prod_cms_outage",
        handle: "cms-outage",
        title: "Product during CMS outage",
        variants: [],
      } as never,
    })
    mockGetStrapiContent.mockRejectedValue(new Error("Strapi unavailable"))

    const unavailable = await loadProductPageData("cms-outage")
    expect(unavailable?.contentStatus).toBe("unavailable")
  })

  it("keeps the last successful enrichment projection during a CMS outage", async () => {
    mockGetProductReadByHandle.mockResolvedValue({
      status: "live",
      product: {
        id: "prod_cached_content",
        handle: "cached-content",
        title: "Product with cached enrichment",
        variants: [],
      } as never,
    })
    mockGetStrapiContent.mockResolvedValue({
      data: [
        {
          documentId: "desc_cached",
          product_handle: "cached-content",
          rich_description: "<p>Last known good description.</p>",
        },
      ],
      meta: {},
    } as never)

    await loadProductPageData("cached-content")
    mockGetStrapiContent.mockRejectedValue(new Error("Strapi unavailable"))

    const cached = await loadProductPageData("cached-content")
    expect(cached?.contentStatus).toBe("found")
    expect(cached?.contentStale).toBe(true)
    expect(cached?.richDescription).toBe("<p>Last known good description.</p>")
  })
})
