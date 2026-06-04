import { MEILISEARCH_PRODUCT_SYNC_FIELDS } from "../product-sync-fields";

describe("MEILISEARCH_PRODUCT_SYNC_FIELDS", () => {
  const fields = [...MEILISEARCH_PRODUCT_SYNC_FIELDS];

  it("uses raw variant prices instead of calculated pricing fields", () => {
    expect(fields).toContain("variants.prices.*");
    expect(fields).not.toContain("variants.calculated_price.*");
    expect(fields).not.toContain("variants.original_price");
    expect(fields).not.toContain("variants.original_price_calculated");
  });

  it("includes product-card enrichment fields used by the search index", () => {
    expect(fields).toEqual(
      expect.arrayContaining([
        "variants.preorder_variant.*",
        "variants.preorder_variant.prices.*",
        "bundle.id",
        "bundle.title",
        "bundle.items.id",
        "bundle.items.quantity",
        "bundle.items.product.id",
        "bundle.items.product.title",
        "bundle.items.product.handle",
      ]),
    );
  });
});
