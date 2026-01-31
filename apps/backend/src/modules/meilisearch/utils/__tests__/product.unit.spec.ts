import { toMeilisearchDocument, type RegionForPricing } from "../product";
import type { SyncProductsStepProduct } from "@3dbyte-tech-store/shared-types";

describe("toMeilisearchDocument", () => {
  const mockRegions: RegionForPricing[] = [
    { id: "reg_123", currency_code: "usd" },
    { id: "reg_456", currency_code: "aud" },
  ];

  const mockProduct: SyncProductsStepProduct = {
    id: "prod_123",
    title: "Test Product",
    handle: "test-product",
    status: "published",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    variants: [
      {
        id: "variant_1",
        prices: [
          { amount: 1000, currency_code: "usd" },
          {
            amount: 1500,
            currency_code: "aud",
            rules: { region_id: "reg_456" },
          },
        ],
      },
    ],
    brand: {
      id: "brand_123",
      name: "Test Brand",
      handle: "test-brand",
    },
  };

  it("should include brand object in the Meilisearch document", () => {
    const result = toMeilisearchDocument(mockProduct, mockRegions);

    expect(result).toHaveProperty("brand");
    expect(result.brand).toEqual({
      id: "brand_123",
      name: "Test Brand",
      handle: "test-brand",
      logo: undefined,
    });
  });

  it("should handle product without brand", () => {
    const productWithoutBrand = { ...mockProduct, brand: null };
    const result = toMeilisearchDocument(productWithoutBrand, mockRegions);

    expect(result.brand).toBeUndefined();
  });

  it("should include multi-currency pricing", () => {
    const result = toMeilisearchDocument(mockProduct, mockRegions);

    expect(result).toHaveProperty("price_usd", 1000);
    expect(result).toHaveProperty("price_aud", 1500);
  });

  it("should flatten options for faceting", () => {
    const productWithOptions: SyncProductsStepProduct = {
      ...mockProduct,
      variants: [
        {
          id: "variant_1",
          options: [
            { option_title: "Color", value: "Red" },
            { option_title: "Size", value: "Medium" },
          ],
          prices: [{ amount: 1000, currency_code: "usd" }],
        },
        {
          id: "variant_2",
          options: [
            { option_title: "Color", value: "Blue" },
            { option_title: "Size", value: "Large" },
          ],
          prices: [{ amount: 1200, currency_code: "usd" }],
        },
      ],
    };
    const result = toMeilisearchDocument(productWithOptions, mockRegions);

    expect(result).toHaveProperty("options_color");
    expect(result.options_color).toEqual(
      expect.arrayContaining(["Red", "Blue"]),
    );
    expect(result).toHaveProperty("options_size");
    expect(result.options_size).toEqual(
      expect.arrayContaining(["Medium", "Large"]),
    );
  });

  it("should flatten options using option_id mapping", () => {
    const productWithOptions: SyncProductsStepProduct = {
      ...mockProduct,
      variants: [
        {
          id: "variant_1",
          options: [
            { option_id: "opt_color_1", value: "Red" },
            { option_id: "opt_size_1", value: "Medium" },
          ],
          prices: [{ amount: 1000, currency_code: "usd" }],
        },
        {
          id: "variant_2",
          options: [
            { option_id: "opt_color_1", value: "Blue" },
            { option_id: "opt_size_1", value: "Large" },
          ],
          prices: [{ amount: 1200, currency_code: "usd" }],
        },
      ],
    };

    // Create option title mapping as plain object
    const optionTitleMap: Record<string, string> = {
      "opt_color_1": "Color",
      "opt_size_1": "Size",
    };

    const result = toMeilisearchDocument(
      productWithOptions,
      mockRegions,
      undefined,
      optionTitleMap,
    );

    expect(result).toHaveProperty("options_color");
    expect(result.options_color).toEqual(
      expect.arrayContaining(["Red", "Blue"]),
    );
    expect(result).toHaveProperty("options_size");
    expect(result.options_size).toEqual(
      expect.arrayContaining(["Medium", "Large"]),
    );
  });
});
