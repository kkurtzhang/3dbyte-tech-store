import type { MedusaCartLineItem } from "@/lib/medusa/cart"
import { analyzeCartContents } from "../cart-analysis"

function createLineItem(overrides: Partial<MedusaCartLineItem> = {}) {
  return {
    id: "line_default",
    title: "Default Item",
    quantity: 1,
    unit_price: 1000,
    metadata: null,
    variant: {
      id: "variant_default",
      title: "Default Variant",
      prices: [{ amount: 1200, currency_code: "usd" }],
      preorder_variant: undefined,
    },
    ...overrides,
  } as MedusaCartLineItem
}

describe("analyzeCartContents", () => {
  it("returns an empty analysis for nullish items", () => {
    expect(analyzeCartContents(undefined)).toMatchObject({
      hasPreorderItems: false,
      hasRegularItems: false,
      isMixedCart: false,
      preorderItems: [],
      bundleGroups: [],
      earliestPreorderDate: null,
      bundleSavingsTotal: 0,
    })

    expect(analyzeCartContents(null)).toMatchObject({
      hasPreorderItems: false,
      hasRegularItems: false,
      isMixedCart: false,
    })
  })

  it("detects a regular-only cart", () => {
    const result = analyzeCartContents([
      createLineItem(),
      createLineItem({
        id: "line_2",
        title: "Second Item",
        quantity: 2,
      }),
    ])

    expect(result).toMatchObject({
      hasPreorderItems: false,
      hasRegularItems: true,
      isMixedCart: false,
      earliestPreorderDate: null,
    })
    expect(result.preorderItems).toHaveLength(0)
    expect(result.bundleGroups).toHaveLength(0)
  })

  it("detects preorder-only carts and returns the earliest availability date", () => {
    const result = analyzeCartContents([
      createLineItem({
        id: "line_pre_1",
        variant: {
          id: "variant_pre_1",
          title: "Default Variant",
          preorder_variant: {
            status: "enabled",
            available_date: "2999-03-01T00:00:00.000Z",
            prices: [{ amount: 900, currency_code: "usd" }],
          },
        },
      }),
      createLineItem({
        id: "line_pre_2",
        variant: {
          id: "variant_pre_2",
          title: "Default Variant",
          preorder_variant: {
            status: "enabled",
            available_date: "2999-01-15T00:00:00.000Z",
            prices: [{ amount: 850, currency_code: "usd" }],
          },
        },
      }),
    ])

    expect(result.hasPreorderItems).toBe(true)
    expect(result.hasRegularItems).toBe(false)
    expect(result.isMixedCart).toBe(false)
    expect(result.preorderItems).toHaveLength(2)
    expect(result.earliestPreorderDate?.toISOString()).toBe("2999-01-15T00:00:00.000Z")
  })

  it("detects mixed carts", () => {
    const result = analyzeCartContents([
      createLineItem(),
      createLineItem({
        id: "line_pre_1",
        variant: {
          id: "variant_pre_1",
          title: "Default Variant",
          preorder_variant: {
            status: "enabled",
            available_date: "2999-04-20T00:00:00.000Z",
            prices: [{ amount: 900, currency_code: "usd" }],
          },
        },
      }),
    ])

    expect(result).toMatchObject({
      hasPreorderItems: true,
      hasRegularItems: true,
      isMixedCart: true,
    })
  })

  it("groups bundle items and totals their savings", () => {
    const result = analyzeCartContents([
      createLineItem({
        id: "line_bundle_1",
        title: "Bundle Child 1",
        unit_price: 900,
        metadata: {
          bundle_id: "bundle_123",
          bundle_title: "Starter Bundle",
          bundle_quantity: 1,
        },
        variant: {
          id: "variant_bundle_1",
          title: "Default Variant",
          prices: [{ amount: 1100, currency_code: "usd" }],
        },
      }),
      createLineItem({
        id: "line_bundle_2",
        title: "Bundle Child 2",
        unit_price: 600,
        metadata: {
          bundle_id: "bundle_123",
          bundle_title: "Starter Bundle",
          bundle_quantity: 1,
        },
        variant: {
          id: "variant_bundle_2",
          title: "Default Variant",
          prices: [{ amount: 700, currency_code: "usd" }],
        },
      }),
    ])

    expect(result.bundleGroups).toHaveLength(1)
    expect(result.bundleGroups[0]).toMatchObject({
      type: "bundle",
      bundleId: "bundle_123",
      bundleTitle: "Starter Bundle",
    })
    expect(result.bundleSavingsTotal).toBe(300)
  })

  it("handles preorder items inside bundles", () => {
    const result = analyzeCartContents([
      createLineItem({
        id: "line_bundle_preorder",
        unit_price: 800,
        metadata: {
          bundle_id: "bundle_preorder",
          bundle_title: "Launch Bundle",
          bundle_quantity: 1,
        },
        variant: {
          id: "variant_bundle_preorder",
          title: "Default Variant",
          prices: [{ amount: 1000, currency_code: "usd" }],
          preorder_variant: {
            status: "enabled",
            available_date: "2999-02-01T00:00:00.000Z",
            prices: [{ amount: 800, currency_code: "usd" }],
          },
        },
      }),
      createLineItem({
        id: "line_regular",
      }),
    ])

    expect(result.hasPreorderItems).toBe(true)
    expect(result.hasRegularItems).toBe(true)
    expect(result.isMixedCart).toBe(true)
    expect(result.bundleGroups).toHaveLength(1)
    expect(result.earliestPreorderDate?.toISOString()).toBe("2999-02-01T00:00:00.000Z")
  })
})
