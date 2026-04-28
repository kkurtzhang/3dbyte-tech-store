import {
  buildProductBreadcrumbs,
  buildProductDetailItems,
} from "../product-detail-content"
import type { MedusaProduct, MedusaProductVariant } from "@/lib/medusa/types"

function createProduct(overrides: Partial<MedusaProduct> = {}) {
  return {
    id: "prod_1",
    title: "Precision Nozzle",
    collection: {
      title: "Nozzles & Tips",
      handle: "nozzles-tips",
    },
    type: { value: "Upgrade" },
    material: "Hardened Steel",
    weight: 42,
    origin_country: "au",
    tags: [{ value: "High flow" }, { value: "Abrasive filaments" }],
    ...overrides,
  } as MedusaProduct
}

function createVariant(overrides: Partial<MedusaProductVariant> = {}) {
  return {
    id: "variant_1",
    sku: "NOZ-04-HS",
    ...overrides,
  } as MedusaProductVariant
}

describe("product detail content helpers", () => {
  it("builds breadcrumbs with collection context when available", () => {
    expect(buildProductBreadcrumbs(createProduct())).toEqual([
      { label: "Home", href: "/" },
      { label: "Shop", href: "/shop" },
      { label: "Nozzles & Tips", href: "/collections/nozzles-tips" },
      { label: "Precision Nozzle" },
    ])
  })

  it("falls back to core breadcrumbs when no collection is present", () => {
    expect(
      buildProductBreadcrumbs(createProduct({ collection: undefined }))
    ).toEqual([
      { label: "Home", href: "/" },
      { label: "Shop", href: "/shop" },
      { label: "Precision Nozzle" },
    ])
  })

  it("prefers source context over canonical collection breadcrumbs", () => {
    expect(
      buildProductBreadcrumbs(createProduct(), {
        label: "Polymaker",
        href: "/brands/polymaker",
      })
    ).toEqual([
      { label: "Home", href: "/" },
      { label: "Polymaker", href: "/brands/polymaker" },
      { label: "Precision Nozzle" },
    ])
  })

  it("builds practical detail items from product and selected variant data", () => {
    expect(buildProductDetailItems(createProduct(), createVariant())).toEqual([
      { label: "SKU", value: "NOZ-04-HS" },
      { label: "Collection", value: "Nozzles & Tips" },
      { label: "Product Type", value: "Upgrade" },
      { label: "Material", value: "Hardened Steel" },
      { label: "Weight", value: "42g" },
      { label: "Origin", value: "AU" },
      { label: "Best For", value: "High flow, Abrasive filaments" },
    ])
  })
})
