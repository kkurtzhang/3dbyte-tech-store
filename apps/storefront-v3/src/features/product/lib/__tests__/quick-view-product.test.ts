import {
  buildQuickViewDetailChips,
  buildQuickViewPreviewProduct,
  buildQuickViewSummary,
  mergeQuickViewProductData,
  type QuickViewProductPreview,
} from "../quick-view-product"

const preview: QuickViewProductPreview = {
  id: "prod_01",
  handle: "test-product",
  title: "Test Product",
  thumbnail: "https://cdn.example.com/test-product.jpg",
  price: {
    amount: 34.22,
    currency_code: "AUD",
  },
  originalPrice: 42,
  inventoryQuantity: 8,
  inStock: true,
}

describe("quick-view-product helpers", () => {
  it("builds a usable preview product from card data", () => {
    const product = buildQuickViewPreviewProduct(preview)

    expect(product.id).toBe(preview.id)
    expect(product.title).toBe(preview.title)
    expect(product.thumbnail).toBe(preview.thumbnail)
    expect(product.images).toEqual([
      {
        id: "preview-image-prod_01",
        url: preview.thumbnail,
      },
    ])
    expect(product.variants?.[0]?.prices).toEqual([
      {
        amount: 34.22,
        currency_code: "aud",
      },
    ])
    expect((product.variants?.[0]?.calculated_price as { original_amount?: number })?.original_amount).toBe(42)
    expect(product.variants?.[0]?.inventory_quantity).toBe(8)
  })

  it("merges fetched product data with preview fallbacks when fetched data is thin", () => {
    const previewProduct = buildQuickViewPreviewProduct(preview)

    const merged = mergeQuickViewProductData(previewProduct, {
      ...previewProduct,
      images: [],
      thumbnail: undefined,
      variants: [
        {
          ...previewProduct.variants?.[0],
          prices: [],
          calculated_price: undefined,
          inventory_quantity: 0,
        },
      ],
    })

    expect(merged.thumbnail).toBe(preview.thumbnail)
    expect(merged.images).toEqual(previewProduct.images)
    expect(merged.variants?.[0]?.prices).toEqual(previewProduct.variants?.[0]?.prices)
    expect((merged.variants?.[0]?.calculated_price as { calculated_amount?: number })?.calculated_amount).toBe(34.22)
  })

  it("builds a trimmed quick-view summary", () => {
    expect(
      buildQuickViewSummary({
        description: "  Technical upgrade part for cleaner extrusion and more consistent first layers.  ",
      } as never)
    ).toBe("Technical upgrade part for cleaner extrusion and more consistent first layers.")
  })

  it("builds compact detail chips from product and selected variant", () => {
    expect(
      buildQuickViewDetailChips(
        {
          collection: { title: "Voron Compatible" },
          type: { value: "Nozzle" },
        } as never,
        {
          sku: "NOZ-04-BR",
          options: [
            {
              option_id: "size",
              value: "0.4mm",
              option: { title: "Size" },
            },
          ],
        } as never
      )
    ).toEqual([
      "SKU NOZ-04-BR",
      "Collection Voron Compatible",
      "Type Nozzle",
      "Size 0.4mm",
    ])
  })
})
