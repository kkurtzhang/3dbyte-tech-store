import { ADDRESS_INDEX_SETTINGS } from "../service";

describe("ADDRESS_INDEX_SETTINGS", () => {
  it("keeps only the filterable attributes used by the store API", () => {
    expect(ADDRESS_INDEX_SETTINGS.filterableAttributes).toEqual(["country"]);
  });

  it("limits searchable address fields to reduce duplicate indexing work", () => {
    expect(ADDRESS_INDEX_SETTINGS.searchableAttributes).toEqual([
      "full_address",
      "postcode",
    ]);
  });

  it("avoids expensive fuzzy matching for numeric address tokens", () => {
    expect(ADDRESS_INDEX_SETTINGS.typoTolerance).toEqual({
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 4,
        twoTypos: 8,
      },
      disableOnNumbers: true,
      disableOnAttributes: ["postcode"],
    });
  });

  it("does not include the sort ranking rule when address results are never sorted", () => {
    expect(ADDRESS_INDEX_SETTINGS.rankingRules).toEqual([
      "words",
      "typo",
      "proximity",
      "attribute",
      "exactness",
    ]);
  });

  it("keeps facet value limits low for autocomplete", () => {
    expect(ADDRESS_INDEX_SETTINGS.faceting).toEqual({
      maxValuesPerFacet: 5,
    });
  });
});
