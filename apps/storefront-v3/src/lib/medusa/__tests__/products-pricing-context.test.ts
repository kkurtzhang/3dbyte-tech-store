jest.mock("../client", () => ({
  sdk: {
    store: {
      product: {
        list: jest.fn(),
      },
    },
  },
}))

const mockMeiliSearch = jest.fn()

jest.mock("@/lib/search/client", () => ({
  INDEX_PRODUCTS: "products",
  searchClient: {
    index: jest.fn(() => ({
      search: mockMeiliSearch,
    })),
  },
}))

import {
  getProductByHandle,
  getProductReadByHandle,
  getProducts,
} from "../products"
import { sdk } from "../client"

const mockProductList = sdk.store.product.list as jest.Mock

describe("Medusa product pricing context", () => {
  beforeEach(() => {
    mockProductList.mockReset()
    mockProductList.mockResolvedValue({ products: [], count: 0 })
    mockMeiliSearch.mockReset()
  })

  it("does not revive a missing Medusa product from a stale search document", async () => {
    mockMeiliSearch.mockResolvedValue({ hits: [{ id: "prod_stale", handle: "removed" }] })

    await expect(getProductReadByHandle("removed")).resolves.toEqual({
      status: "not_found",
    })
    expect(mockMeiliSearch).not.toHaveBeenCalled()
  })

  it("returns cached search content as read-only when Medusa is unavailable", async () => {
    mockProductList.mockRejectedValue(new Error("Medusa unavailable"))
    mockMeiliSearch.mockResolvedValue({
      hits: [
        {
          id: "prod_cached",
          handle: "cached-product",
          title: "Cached Product",
          price_aud: 99,
          inventory_quantity: 12,
          variants: [{ id: "variant_cached", title: "Default" }],
        },
      ],
    })

    const result = await getProductReadByHandle("cached-product")

    expect(result.status).toBe("cached_read_only")
    if (result.status === "cached_read_only") {
      expect(result.product.variants).toEqual([])
    }
  })

  it("distinguishes a total product outage from a missing product", async () => {
    mockProductList.mockRejectedValue(new Error("Medusa unavailable"))
    mockMeiliSearch.mockRejectedValue(new Error("Meilisearch unavailable"))

    await expect(getProductReadByHandle("unknown")).resolves.toEqual({
      status: "unavailable",
    })
  })

  it("passes selected region context when listing products with prices", async () => {
    await getProducts({
      region_id: "reg_nz",
      country_code: "nz",
      currency_code: "nzd",
    })

    expect(mockProductList).toHaveBeenCalledWith(
      expect.objectContaining({
        region_id: "reg_nz",
        country_code: "nz",
        fields: expect.stringContaining("*variants.calculated_price"),
      })
    )
  })

  it("passes selected region context when loading a product detail page", async () => {
    await getProductByHandle("test-product", {
      region_id: "reg_au",
      country_code: "au",
      currency_code: "aud",
    })

    expect(mockProductList).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: "test-product",
        region_id: "reg_au",
        country_code: "au",
        fields: expect.stringContaining("*variants.calculated_price"),
      })
    )
  })
})
