import { loadProductPageData } from "../load-product-page-data"
import { getProductByHandle } from "@/lib/medusa/products"
import { getStrapiContent } from "@/lib/strapi/content"
import { getPublicProductDocuments } from "@/lib/product-documents/api"

jest.mock("@/lib/medusa/products", () => ({
  getProductByHandle: jest.fn(),
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

const mockGetProductByHandle = getProductByHandle as jest.MockedFunction<
  typeof getProductByHandle
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
    mockGetProductByHandle.mockResolvedValue({
      id: "prod_1",
      handle: "ai-petg-black-175-1kg",
      title: "AI PETG Black 1.75mm 1kg",
      variants: [],
    } as never)
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
  })
})
