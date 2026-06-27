import {
  buildProductIndexSettings,
} from "../configure-product-index";

describe("buildProductIndexSettings", () => {
  it("adds bundle fields to filterable, searchable, and displayed attributes", () => {
    const settings = buildProductIndexSettings();

    expect(settings.filterableAttributes).toEqual(
      expect.arrayContaining(["is_bundle", "bundle_id"]),
    );
    expect(settings.searchableAttributes).toEqual(
      expect.arrayContaining(["bundle_item_titles"]),
    );
    expect(settings.displayedAttributes).toEqual(
      expect.arrayContaining([
        "is_bundle",
        "bundle_id",
        "bundle_item_count",
        "bundle_item_titles",
      ]),
    );
  });

  it("seeds storefront price and option facets for fresh indexes", () => {
    const settings = buildProductIndexSettings();

    expect(settings.filterableAttributes).toEqual(
      expect.arrayContaining([
        "price_aud",
        "options_colour",
        "options_size",
        "options_nozzle_type",
        "options_nozzle_size",
      ]),
    );
    expect(settings.sortableAttributes).toEqual(
      expect.arrayContaining(["created_at_timestamp", "price_aud"]),
    );
    expect(settings.displayedAttributes).toEqual(
      expect.arrayContaining([
        "category_ids",
        "price_aud",
        "tax_inclusive_price_aud",
        "options_colour",
        "options_size",
        "options_nozzle_type",
        "options_nozzle_size",
      ]),
    );
  });

  it("preserves dynamic attributes from existing settings", () => {
    const settings = buildProductIndexSettings({
      filterableAttributes: ["options_colour"],
      searchableAttributes: ["variants.sku", "options_colour"],
      displayedAttributes: ["options_colour"],
      sortableAttributes: ["price_aud"],
    });

    expect(settings.filterableAttributes).toEqual(
      expect.arrayContaining(["options_colour", "is_bundle"]),
    );
    expect(settings.searchableAttributes).toEqual(
      expect.arrayContaining(["options_colour", "bundle_item_titles"]),
    );
    expect(settings.displayedAttributes).toEqual(
      expect.arrayContaining(["options_colour", "bundle_item_count"]),
    );
    expect(settings.sortableAttributes).toEqual(
      expect.arrayContaining(["created_at_timestamp", "price_aud"]),
    );
  });

  it("adds AI-ready product metadata fields to product index settings", () => {
    const settings = buildProductIndexSettings();

    expect(settings.filterableAttributes).toEqual(
      expect.arrayContaining([
        "aic_product_kind",
        "aic_audience",
        "tdp_product_kind",
        "tdp_material",
        "tdp_requires_enclosure",
        "tdp_requires_hardened_nozzle",
        "tdp_drying_recommended",
        "tdp_compatible_printers",
        "tdp_compatible_build_surfaces",
        "rcb_component_role",
        "rcb_compatible_project_types",
        "rcb_connector_type",
        "rcb_voltage",
      ]),
    );
    expect(settings.searchableAttributes).toEqual(
      expect.arrayContaining([
        "aic_best_for",
        "aic_not_recommended_for",
        "aic_compatibility_notes",
        "aic_care_or_safety_notes",
        "aic_ai_search_keywords",
        "tdp_best_for",
        "tdp_not_recommended_for",
        "tdp_common_issues",
        "tdp_ai_search_keywords",
        "rcb_used_for",
        "rcb_best_for",
        "rcb_ai_search_keywords",
      ]),
    );
    expect(settings.displayedAttributes).toEqual(
      expect.arrayContaining([
        "aic_schema_version",
        "aic_product_kind",
        "aic_audience",
        "aic_best_for",
        "aic_not_recommended_for",
        "aic_compatibility_notes",
        "aic_care_or_safety_notes",
        "aic_ai_search_keywords",
        "tdp_product_kind",
        "tdp_material",
        "tdp_requires_hardened_nozzle",
        "tdp_best_for",
        "tdp_ai_search_keywords",
        "rcb_component_role",
        "rcb_used_for",
        "rcb_best_for",
        "rcb_ai_search_keywords",
      ]),
    );
  });
});
