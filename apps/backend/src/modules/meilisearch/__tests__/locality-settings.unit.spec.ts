import { LOCALITY_INDEX_SETTINGS } from "../service";

describe("LOCALITY_INDEX_SETTINGS", () => {
  it("supports filtering by country and state for PDP availability checks", () => {
    expect(LOCALITY_INDEX_SETTINGS.filterableAttributes).toEqual([
      "country",
      "state",
    ]);
  });

  it("searches locality names and postcodes without address-level fields", () => {
    expect(LOCALITY_INDEX_SETTINGS.searchableAttributes).toEqual([
      "display_name",
      "locality",
      "postcode",
    ]);
  });

  it("returns only locality document fields and excludes address_count", () => {
    expect(LOCALITY_INDEX_SETTINGS.displayedAttributes).toEqual([
      "id",
      "display_name",
      "locality",
      "state",
      "postcode",
      "country",
    ]);
    expect(LOCALITY_INDEX_SETTINGS.displayedAttributes).not.toContain(
      "address_count",
    );
  });

  it("keeps autocomplete pagination bounded", () => {
    expect(LOCALITY_INDEX_SETTINGS.pagination).toEqual({
      maxTotalHits: 100,
    });
  });
});
