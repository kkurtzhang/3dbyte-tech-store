import type { BundleProduct } from "@/lib/medusa/bundles"
import type { MedusaProduct } from "@/lib/medusa/types"
import {
  getBundleInventorySummary,
  getBundleItemPricing,
  getBundlePricingSummary,
  getRenderableOptions,
  getSelectedVariantLabel,
} from "../bundle-pricing"

function createProduct(
  overrides: Partial<MedusaProduct> & {
    title: string
  }
) {
  return {
    id: overrides.id || `prod_${overrides.title}`,
    title: overrides.title,
    handle: overrides.handle || overrides.title.toLowerCase().replace(/\s+/g, "-"),
    variants: overrides.variants || [],
    options: overrides.options || [],
    ...overrides,
  } as MedusaProduct
}

describe("bundle-pricing", () => {
  it("calculates bundle savings and percentage from bundle items", () => {
    const bundle = {
      id: "bundle_123",
      title: "Starter Bundle",
      product: createProduct({
        title: "Starter Bundle",
        variants: [
          {
            id: "variant_bundle",
            title: "Default",
            prices: [{ amount: 149, currency_code: "aud" }],
            calculated_price: {
              calculated_amount: 149,
              original_amount: 149,
              currency_code: "aud",
            },
          },
        ],
      }),
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: createProduct({
            title: "Printer",
            variants: [
              {
                id: "variant_printer",
                title: "Default",
                prices: [{ amount: 99, currency_code: "aud" }],
              },
            ],
          }),
        },
        {
          id: "item_2",
          quantity: 2,
          product: createProduct({
            title: "Filament",
            variants: [
              {
                id: "variant_filament",
                title: "Default",
                prices: [{ amount: 40, currency_code: "aud" }],
              },
            ],
          }),
        },
      ],
    } as BundleProduct

    expect(getBundlePricingSummary(bundle)).toEqual(
      expect.objectContaining({
        bundlePrice: 149,
        compareAtPrice: 179,
        defaultCompareAtPrice: 179,
        bundleDiscountAmount: 30,
        savings: 30,
        savingsPercentage: 17,
        currencyCode: "aud",
      })
    )
  })

  it("increases the bundle total when a more expensive variant is selected", () => {
    const bundle = {
      id: "bundle_123",
      title: "Starter Bundle",
      product: createProduct({
        title: "Starter Bundle",
        variants: [
          {
            id: "variant_bundle",
            title: "Default",
            prices: [{ amount: 75, currency_code: "aud" }],
            calculated_price: {
              calculated_amount: 75,
              original_amount: 75,
              currency_code: "aud",
            },
          },
        ],
      }),
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: createProduct({
            title: "Part A",
            variants: [
              {
                id: "variant_default",
                title: "Default",
                prices: [{ amount: 50, currency_code: "aud" }],
                calculated_price: {
                  calculated_amount: 50,
                  original_amount: 50,
                  currency_code: "aud",
                },
              },
              {
                id: "variant_premium",
                title: "Premium",
                prices: [{ amount: 70, currency_code: "aud" }],
                calculated_price: {
                  calculated_amount: 70,
                  original_amount: 70,
                  currency_code: "aud",
                },
              },
            ],
          }),
        },
        {
          id: "item_2",
          quantity: 1,
          product: createProduct({
            title: "Part B",
            variants: [
              {
                id: "variant_regular",
                title: "Default",
                prices: [{ amount: 40, currency_code: "aud" }],
                calculated_price: {
                  calculated_amount: 40,
                  original_amount: 40,
                  currency_code: "aud",
                },
              },
            ],
          }),
        },
      ],
    } as BundleProduct

    expect(
      getBundlePricingSummary(bundle, {
        item_1: "variant_premium",
        item_2: "variant_regular",
      })
    ).toEqual(
      expect.objectContaining({
        bundlePrice: 95,
        compareAtPrice: 110,
        defaultCompareAtPrice: 90,
        bundleDiscountAmount: 15,
        savings: 15,
        savingsPercentage: 14,
      })
    )
  })

  it("allocates per-item bundled pricing proportionally", () => {
    const bundle = {
      id: "bundle_123",
      title: "Starter Bundle",
      product: createProduct({
        title: "Starter Bundle",
        variants: [
          {
            id: "variant_bundle",
            title: "Default",
            prices: [{ amount: 75, currency_code: "aud" }],
            calculated_price: {
              calculated_amount: 75,
              original_amount: 75,
              currency_code: "aud",
            },
          },
        ],
      }),
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: createProduct({
            title: "Part A",
            variants: [
              {
                id: "variant_a",
                title: "Default",
                prices: [{ amount: 53.57, currency_code: "aud" }],
                calculated_price: {
                  calculated_amount: 53.57,
                  original_amount: 53.57,
                  currency_code: "aud",
                },
              },
            ],
          }),
        },
        {
          id: "item_2",
          quantity: 1,
          product: createProduct({
            title: "Part B",
            variants: [
              {
                id: "variant_b",
                title: "Default",
                prices: [{ amount: 35.63, currency_code: "aud" }],
                calculated_price: {
                  calculated_amount: 35.63,
                  original_amount: 35.63,
                  currency_code: "aud",
                },
              },
            ],
          }),
        },
      ],
    } as BundleProduct

    const itemPricing = getBundleItemPricing(bundle, bundle.items[0])

    expect(itemPricing.currencyCode).toBe("aud")
    expect(itemPricing.standaloneTotalPrice).toBeCloseTo(53.57)
    expect(itemPricing.bundledTotalPrice).toBeCloseTo(45.04, 2)
    expect(itemPricing.savings).toBeCloseTo(8.53, 2)
  })

  it("hides default-only variant labels and default-only option groups", () => {
    const product = createProduct({
      title: "Part A",
      variants: [
        {
          id: "variant_a",
          title: "Default Title",
          options: [
            {
              id: "optval_default",
              option_id: "opt_default",
              value: "Default",
            },
          ],
        },
      ],
      options: [
        {
          id: "opt_default",
          title: "Default",
          values: [
            {
              id: "optval_default",
              value: "Default",
              option_id: "opt_default",
            },
          ],
        },
      ],
    })

    expect(getSelectedVariantLabel(product, "variant_a")).toBeNull()
    expect(getRenderableOptions(product)).toEqual([])
  })

  it("derives bundle availability from the selected child variants", () => {
    const bundle = {
      id: "bundle_123",
      title: "Starter Bundle",
      product: createProduct({
        title: "Starter Bundle",
        variants: [
          {
            id: "variant_bundle",
            title: "Default",
            prices: [{ amount: 75, currency_code: "aud" }],
          },
        ],
      }),
      items: [
        {
          id: "item_1",
          quantity: 2,
          product: createProduct({
            title: "Part A",
            variants: [
              {
                id: "variant_a",
                title: "Standard",
                inventory_quantity: 7,
                manage_inventory: true,
                allow_backorder: false,
                prices: [{ amount: 50, currency_code: "aud" }],
              },
            ],
          }),
        },
        {
          id: "item_2",
          quantity: 1,
          product: createProduct({
            title: "Part B",
            variants: [
              {
                id: "variant_b",
                title: "Standard",
                inventory_quantity: 3,
                manage_inventory: true,
                allow_backorder: false,
                prices: [{ amount: 40, currency_code: "aud" }],
              },
            ],
          }),
        },
      ],
    } as BundleProduct

    expect(getBundleInventorySummary(bundle)).toEqual(
      expect.objectContaining({
        status: "low-stock",
        availableQuantity: 3,
      })
    )
  })

  it("keeps bundle inventory in stock when the selected quantity is five or more", () => {
    const bundle = {
      id: "bundle_123",
      title: "Starter Bundle",
      product: createProduct({
        title: "Starter Bundle",
        variants: [
          {
            id: "variant_bundle",
            title: "Default",
            prices: [{ amount: 75, currency_code: "aud" }],
          },
        ],
      }),
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: createProduct({
            title: "Part A",
            variants: [
              {
                id: "variant_a",
                title: "Standard",
                inventory_quantity: 6,
                manage_inventory: true,
                allow_backorder: false,
                prices: [{ amount: 50, currency_code: "aud" }],
              },
            ],
          }),
        },
      ],
    } as BundleProduct

    expect(getBundleInventorySummary(bundle)).toEqual(
      expect.objectContaining({
        status: "in-stock",
        availableQuantity: 6,
      })
    )
  })

  it("marks a bundle out of stock when any selected child variant blocks fulfillment", () => {
    const bundle = {
      id: "bundle_123",
      title: "Starter Bundle",
      product: createProduct({
        title: "Starter Bundle",
        variants: [
          {
            id: "variant_bundle",
            title: "Default",
            prices: [{ amount: 75, currency_code: "aud" }],
          },
        ],
      }),
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: createProduct({
            title: "Part A",
            variants: [
              {
                id: "variant_a",
                title: "Standard",
                inventory_quantity: 0,
                manage_inventory: true,
                allow_backorder: false,
                prices: [{ amount: 50, currency_code: "aud" }],
              },
            ],
          }),
        },
        {
          id: "item_2",
          quantity: 1,
          product: createProduct({
            title: "Part B",
            variants: [
              {
                id: "variant_b",
                title: "Standard",
                inventory_quantity: 20,
                manage_inventory: true,
                allow_backorder: false,
                prices: [{ amount: 40, currency_code: "aud" }],
              },
            ],
          }),
        },
      ],
    } as BundleProduct

    expect(getBundleInventorySummary(bundle)).toEqual(
      expect.objectContaining({
        status: "out-of-stock",
        availableQuantity: 0,
      })
    )
  })

  it("treats backorderable bundle items without tracked stock as in stock", () => {
    const bundle = {
      id: "bundle_123",
      title: "Starter Bundle",
      product: createProduct({
        title: "Starter Bundle",
        variants: [
          {
            id: "variant_bundle",
            title: "Default",
            prices: [{ amount: 75, currency_code: "aud" }],
          },
        ],
      }),
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: createProduct({
            title: "Part A",
            variants: [
              {
                id: "variant_backorder",
                title: "Standard",
                inventory_quantity: null,
                manage_inventory: true,
                allow_backorder: true,
                prices: [{ amount: 50, currency_code: "aud" }],
              },
            ],
          }),
        },
      ],
    } as BundleProduct

    expect(getBundleInventorySummary(bundle)).toEqual(
      expect.objectContaining({
        status: "in-stock",
        availableQuantity: null,
      })
    )
  })
})
