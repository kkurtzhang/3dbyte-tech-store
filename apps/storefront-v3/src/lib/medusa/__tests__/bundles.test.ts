jest.mock("../client", () => ({
  sdk: {
    client: {
      fetch: jest.fn(),
    },
  },
}))

import {
  getAvailableInBundleLinks,
  getAvailableInBundleProducts,
  getBundleLink,
  getProductPath,
  isBundledProduct,
} from "../bundles"
import type { MedusaProduct } from "../types"

const mockFetch = jest.requireMock("../client").sdk.client.fetch as jest.Mock

function createProduct(overrides: Partial<MedusaProduct> = {}) {
  return {
    id: "prod_123",
    title: "Bundle Product",
    handle: "bundle-product",
    variants: [],
    options: [],
    ...overrides,
  } as MedusaProduct
}

describe("bundle helpers", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it("returns the linked bundle when present on the product", () => {
    const product = createProduct({
      bundle: {
        id: "bundle_123",
      },
    } as never)

    expect(getBundleLink(product)).toEqual({
      id: "bundle_123",
    })
    expect(isBundledProduct(product)).toBe(true)
  })

  it("returns null for products without a bundle link", () => {
    const product = createProduct()

    expect(getBundleLink(product)).toBeNull()
    expect(isBundledProduct(product)).toBe(false)
  })

  it("returns available bundle links from product metadata", () => {
    const product = createProduct({
      available_in_bundles: [
        { id: "bundle_123", handle: "starter-bundle", title: "Starter Bundle" },
        { id: "bundle_456", handle: "pro-bundle", title: "Pro Bundle" },
      ],
    } as never)

    expect(getAvailableInBundleLinks(product)).toEqual([
      { id: "bundle_123", handle: "starter-bundle", title: "Starter Bundle" },
      { id: "bundle_456", handle: "pro-bundle", title: "Pro Bundle" },
    ])
  })

  it("fetches available bundle products from the store bundle lookup route", async () => {
    mockFetch.mockResolvedValueOnce({
      bundles: [
        {
          id: "bundle_123",
          title: "Starter Bundle",
          items: [],
        },
      ],
    })

    const bundles = await getAvailableInBundleProducts("prod_123", {
      currency_code: "aud",
      region_id: "reg_123",
    })

    expect(mockFetch).toHaveBeenCalledWith("/store/products/prod_123/bundles", {
      method: "GET",
      query: {
        currency_code: "aud",
        region_id: "reg_123",
      },
    })
    expect(bundles).toHaveLength(1)
    expect(bundles[0]?.id).toBe("bundle_123")
  })

  it("normalizes bundle lookup payloads when linked products are returned as arrays", async () => {
    mockFetch.mockResolvedValueOnce({
      bundles: [
        {
          id: "bundle_123",
          title: "Starter Bundle",
          product: [
            {
              id: "prod_bundle",
              handle: "starter-bundle",
              title: "Starter Bundle Product",
              variants: [],
            },
          ],
          items: [
            {
              id: "item_123",
              quantity: 2,
              product: [
                {
                  id: "prod_child",
                  handle: "spare-nozzle",
                  title: "Spare Nozzle",
                  variants: [],
                },
              ],
            },
          ],
        },
      ],
    })

    const bundles = await getAvailableInBundleProducts("prod_123")

    expect(bundles).toEqual([
      expect.objectContaining({
        id: "bundle_123",
        product: expect.objectContaining({
          handle: "starter-bundle",
        }),
        items: [
          expect.objectContaining({
            quantity: 2,
            product: expect.objectContaining({
              title: "Spare Nozzle",
            }),
          }),
        ],
      }),
    ])
  })

  it("builds dedicated bundle product paths", () => {
    expect(getProductPath("starter-bundle", true)).toBe("/bundles/starter-bundle")
    expect(getProductPath("spare-nozzle", false)).toBe("/products/spare-nozzle")
  })
})
