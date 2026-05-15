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
});
