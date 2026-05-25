jest.mock("../client", () => ({
  sdk: {
    store: {
      product: {
        list: jest.fn(),
      },
    },
  },
}))

import { getProductByHandle, getProducts } from "../products"
import { sdk } from "../client"

const mockProductList = sdk.store.product.list as jest.Mock

describe("Medusa product pricing context", () => {
  beforeEach(() => {
    mockProductList.mockReset()
    mockProductList.mockResolvedValue({ products: [], count: 0 })
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
