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

  it("uses the first product image when a bundle product has no thumbnail", () => {
    const document = toMeilisearchDocument(
      createProduct({
        thumbnail: null,
        images: [
          {
            url: "https://example.com/bundle-gallery.jpg",
          },
        ],
        bundle: {
          id: "bundle_123",
          title: "Starter Bundle",
          items: [],
        },
      }),
      regions,
    );

    expect(document.thumbnail).toBe("https://example.com/bundle-gallery.jpg");
  });

  it("indexes active preorder variants for listing badges", () => {
    const document = toMeilisearchDocument(
      createProduct({
        variants: [
          {
            id: "variant_preorder",
            title: "Default",
            sku: "PRE-001",
            prices: [
              {
                amount: 149,
                currency_code: "aud",
              },
            ],
            options: [],
            preorder_variant: {
              id: "pre_123",
              status: "enabled",
              available_date: "2999-01-01T00:00:00.000Z",
              prices: [
                {
                  amount: 129,
                  currency_code: "aud",
                },
              ],
            },
          },
        ],
      } as Partial<SyncProductsStepProduct>),
      regions,
    );

    expect(document.is_preorder).toBe(true);
    expect(document.preorder_available_date).toBe("2999-01-01T00:00:00.000Z");
    expect(document.variants[0]).toEqual(
      expect.objectContaining({
        preorder_variant: expect.objectContaining({
          status: "enabled",
          available_date: "2999-01-01T00:00:00.000Z",
        }),
      }),
    );
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

  it("indexes ancestor category IDs so parent category filters include child products", () => {
    const document = toMeilisearchDocument(
      createProduct({
        categories: [
          {
            id: "cat_petg",
            name: "PETG",
            handle: "petg",
            parent_category: {
              id: "cat_filament",
              name: "Filament",
              handle: "filament",
              parent_category: null,
            },
          },
        ],
      } as Partial<SyncProductsStepProduct>),
      regions,
    );

    expect(document.category_ids).toEqual(
      expect.arrayContaining(["cat_filament", "cat_petg"]),
    );
  });

  it("flattens 3D printing metadata into searchable product facts", () => {
    const document = toMeilisearchDocument(
      createProduct({
        metadata: {
          three_d_printing: {
            schema_version: 1,
            product_kind: "filament",
            material: "PETG",
            diameter_mm: 1.75,
            recommended_nozzle_temp_c: { min: 230, max: 250 },
            recommended_bed_temp_c: { min: 70, max: 85 },
            requires_enclosure: false,
            requires_hardened_nozzle: false,
            drying_recommended: true,
            compatible_printers: ["Bambu A1", "Prusa MK4"],
            compatible_build_surfaces: ["textured_pei", "satin_pei"],
            best_for: ["functional parts", "3DSets body panels"],
            not_recommended_for: ["high-temperature parts"],
            common_issues: ["stringing"],
            ai_search_keywords: ["PETG filament", "outdoor prints"],
          },
        },
      } as Partial<SyncProductsStepProduct>),
      regions,
    );

    expect(document).toEqual(
      expect.objectContaining({
        tdp_schema_version: 1,
        tdp_product_kind: "filament",
        tdp_material: "PETG",
        tdp_diameter_mm: 1.75,
        tdp_nozzle_temp_min_c: 230,
        tdp_nozzle_temp_max_c: 250,
        tdp_bed_temp_min_c: 70,
        tdp_bed_temp_max_c: 85,
        tdp_requires_enclosure: false,
        tdp_requires_hardened_nozzle: false,
        tdp_drying_recommended: true,
        tdp_compatible_printers: ["Bambu A1", "Prusa MK4"],
        tdp_compatible_build_surfaces: ["textured_pei", "satin_pei"],
        tdp_best_for: ["functional parts", "3DSets body panels"],
        tdp_not_recommended_for: ["high-temperature parts"],
        tdp_common_issues: ["stringing"],
        tdp_ai_search_keywords: ["PETG filament", "outdoor prints"],
      }),
    );
  });

  it("flattens RC model building metadata into searchable product facts", () => {
    const document = toMeilisearchDocument(
      createProduct({
        metadata: {
          rc_model_building: {
            schema_version: 1,
            component_role: "drive_motor",
            compatible_project_types: ["3d_printed_rc_car"],
            voltage: "7.4V",
            connector_type: "XT60",
            used_for: ["crawler drivetrain"],
            best_for: ["3DSets-style RC builds"],
            ai_search_keywords: ["RC motor", "3DSets drivetrain"],
          },
        },
      } as Partial<SyncProductsStepProduct>),
      regions,
    );

    expect(document).toEqual(
      expect.objectContaining({
        rcb_schema_version: 1,
        rcb_component_role: "drive_motor",
        rcb_compatible_project_types: ["3d_printed_rc_car"],
        rcb_voltage: "7.4V",
        rcb_connector_type: "XT60",
        rcb_used_for: ["crawler drivetrain"],
        rcb_best_for: ["3DSets-style RC builds"],
        rcb_ai_search_keywords: ["RC motor", "3DSets drivetrain"],
      }),
    );
  });

  it("ignores malformed AI metadata while indexing the product normally", () => {
    const document = toMeilisearchDocument(
      createProduct({
        metadata: {
          three_d_printing: "not-an-object",
          rc_model_building: {
            component_role: ["not", "a", "string"],
            best_for: ["valid use", "", 42],
          },
        },
      } as Partial<SyncProductsStepProduct>),
      regions,
    );

    expect(document.id).toBe("prod_bundle");
    expect(document.title).toBe("Starter Bundle");
    expect(document.tdp_product_kind).toBeUndefined();
    expect(document.rcb_component_role).toBeUndefined();
    expect(document.rcb_best_for).toEqual(["valid use"]);
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
