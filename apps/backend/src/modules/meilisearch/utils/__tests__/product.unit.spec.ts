import {
  buildRegionsForPricing,
  toMeilisearchDocument,
  type RegionForPricing,
} from "../product";
import type { SyncProductsStepProduct } from "@3dbyte-tech-store/shared-types";

const regions: RegionForPricing[] = [
  {
    id: "reg_aud",
    currency_code: "aud",
    is_tax_inclusive: true,
  },
];

function createProduct(
  overrides: Partial<SyncProductsStepProduct> = {},
): SyncProductsStepProduct {
  return {
    id: "prod_bundle",
    title: "Starter Bundle",
    handle: "starter-bundle",
    description: "Bundle description",
    thumbnail: "https://example.com/bundle.jpg",
    status: "published",
    created_at: "2026-04-12T00:00:00.000Z",
    updated_at: "2026-04-12T00:00:00.000Z",
    collection_id: "pcol_123",
    type_id: "ptyp_123",
    variants: [
      {
        id: "variant_1",
        title: "Default",
        sku: "BUNDLE-001",
        prices: [
          {
            amount: 149,
            currency_code: "aud",
          },
        ],
        options: [],
      },
    ],
    categories: [
      {
        id: "pcat_123",
        name: "Bundles",
        handle: "bundles",
      },
    ],
    tags: [
      {
        id: "ptag_123",
        value: "starter",
      },
    ],
    ...overrides,
  };
}

describe("toMeilisearchDocument", () => {
  it("marks bundle products with bundle metadata", () => {
    const product = createProduct({
      bundle: {
        id: "bundle_123",
        title: "Starter Bundle",
        items: [
          {
            id: "item_1",
            quantity: 1,
            product: {
              id: "prod_printer",
              title: "Printer",
              handle: "printer",
            },
          },
          {
            id: "item_2",
            quantity: 2,
            product: {
              id: "prod_filament",
              title: "Filament",
              handle: "filament",
            },
          },
        ],
      },
    });

    const document = toMeilisearchDocument(product, regions);

    expect(document.is_bundle).toBe(true);
    expect(document.bundle_id).toBe("bundle_123");
    expect(document.bundle_item_count).toBe(2);
    expect(document.bundle_item_titles).toEqual(["Printer", "Filament"]);
  });

  it("defaults non-bundles to searchable empty bundle metadata", () => {
    const document = toMeilisearchDocument(createProduct(), regions);

    expect(document.is_bundle).toBe(false);
    expect(document.bundle_id).toBeUndefined();
    expect(document.bundle_item_count).toBe(0);
    expect(document.bundle_item_titles).toEqual([]);
  });

  it("indexes the region-scoped GST-inclusive price for customer-facing AUD search", () => {
    const document = toMeilisearchDocument(
      createProduct({
        variants: [
          {
            id: "variant_1",
            title: "Default",
            sku: "GST-001",
            prices: [
              {
                amount: 100,
                currency_code: "aud",
              },
              {
                amount: 110,
                currency_code: "aud",
                rules: {
                  region_id: "reg_aud",
                },
              },
            ],
            options: [],
          },
        ],
      }),
      regions,
    );

    expect(document.price_aud).toBe(110);
    expect(document.tax_inclusive_price_aud).toBe(true);
  });

  it("falls back to the currency price when no region-scoped price exists", () => {
    const document = toMeilisearchDocument(createProduct(), regions);

    expect(document.price_aud).toBe(149);
    expect(document.tax_inclusive_price_aud).toBe(true);
  });
});

describe("buildRegionsForPricing", () => {
  it("uses region-scoped price preferences for tax-inclusive indexing", () => {
    const result = buildRegionsForPricing(
      [{ id: "reg_au", currency_code: "aud" }],
      [
        {
          attribute: "region_id",
          value: "reg_au",
          is_tax_inclusive: true,
        },
      ],
    );

    expect(result).toEqual([
      {
        id: "reg_au",
        currency_code: "aud",
        is_tax_inclusive: true,
      },
    ]);
  });

  it("falls back to currency-scoped price preferences when a region preference is absent", () => {
    const result = buildRegionsForPricing(
      [{ id: "reg_au", currency_code: "aud" }],
      [
        {
          attribute: "currency_code",
          value: "AUD",
          is_tax_inclusive: true,
        },
      ],
    );

    expect(result[0]?.is_tax_inclusive).toBe(true);
  });

  it("prefers region-scoped preferences over currency-scoped preferences", () => {
    const result = buildRegionsForPricing(
      [{ id: "reg_au", currency_code: "aud" }],
      [
        {
          attribute: "currency_code",
          value: "aud",
          is_tax_inclusive: true,
        },
        {
          attribute: "region_id",
          value: "reg_au",
          is_tax_inclusive: false,
        },
      ],
    );

    expect(result[0]?.is_tax_inclusive).toBe(false);
  });
});
