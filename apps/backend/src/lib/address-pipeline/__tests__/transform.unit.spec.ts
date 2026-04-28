import { isIndexableAddressFeature, transformFeature } from "../ingest";
import type { OpenAddressFeature } from "../types";

/**
 * Factory function for creating test GeoJSON Features
 */
function createFeature(
  overrides: Partial<OpenAddressFeature["properties"]> = {}
): OpenAddressFeature {
  return {
    type: "Feature",
    properties: {
      hash: "abc123def456",
      number: "12",
      street: "Main Street",
      unit: "",
      city: "Sydney",
      district: "",
      region: "NSW",
      postcode: "2000",
      id: "",
      ...overrides,
    },
    geometry: {
      type: "Point",
      coordinates: [151.2093, -33.8688],
    },
  };
}

describe("transformFeature", () => {
  it("transforms a valid feature to MeilisearchAddressDocument", () => {
    const feature = createFeature();
    const doc = transformFeature(feature, 0);

    expect(doc).toEqual({
      id: "abc123def456",
      full_address: "12 Main Street, Sydney, NSW, 2000",
      unit: "",
      number: "12",
      street: "Main Street",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      country: "AU",
    });
  });

  it("composes full_address from all non-empty parts", () => {
    const feature = createFeature({ unit: "Unit 3" });
    const doc = transformFeature(feature, 0);

    expect(doc.full_address).toBe("Unit 3, 12 Main Street, Sydney, NSW, 2000");
    expect(doc.unit).toBe("Unit 3");
  });

  it("handles empty unit field without leading comma", () => {
    const feature = createFeature({ unit: "" });
    const doc = transformFeature(feature, 0);

    expect(doc.full_address).toBe("12 Main Street, Sydney, NSW, 2000");
    expect(doc.unit).toBe("");
  });

  it("handles whitespace-only unit field", () => {
    const feature = createFeature({ unit: "   " });
    const doc = transformFeature(feature, 0);

    expect(doc.full_address).toBe("12 Main Street, Sydney, NSW, 2000");
    expect(doc.unit).toBe("");
  });

  it("uses fallback ID when hash is missing", () => {
    const feature = createFeature({ hash: "" });
    const doc = transformFeature(feature, 42);

    expect(doc.id).toBe("au_42");
  });

  it("uses hash as ID when available", () => {
    const feature = createFeature({ hash: "custom_hash_123" });
    const doc = transformFeature(feature, 99);

    expect(doc.id).toBe("custom_hash_123");
  });

  it("handles empty number field", () => {
    const feature = createFeature({ number: "" });
    const doc = transformFeature(feature, 0);

    expect(doc.full_address).toBe("Main Street, Sydney, NSW, 2000");
    expect(doc.number).toBe("");
  });

  it("trims whitespace from all fields", () => {
    const feature = createFeature({
      number: "  12  ",
      street: "  Main Street  ",
      city: "  Sydney  ",
      region: "  NSW  ",
      postcode: "  2000  ",
    });
    const doc = transformFeature(feature, 0);

    expect(doc.number).toBe("12");
    expect(doc.street).toBe("Main Street");
    expect(doc.suburb).toBe("Sydney");
    expect(doc.state).toBe("NSW");
    expect(doc.postcode).toBe("2000");
  });

  it("always sets country to AU", () => {
    const feature = createFeature();
    const doc = transformFeature(feature, 0);

    expect(doc.country).toBe("AU");
  });

  it("handles all fields empty gracefully", () => {
    const feature = createFeature({
      hash: "",
      number: "",
      street: "",
      unit: "",
      city: "",
      district: "",
      region: "",
      postcode: "",
    });
    const doc = transformFeature(feature, 5);

    expect(doc.id).toBe("au_5");
    expect(doc.full_address).toBe("");
    expect(doc.country).toBe("AU");
  });
});

describe("isIndexableAddressFeature", () => {
  it("returns true when a feature has street data", () => {
    expect(isIndexableAddressFeature(createFeature())).toBe(true);
  });

  it("returns true when a feature has only a street number", () => {
    const feature = createFeature({ street: "", number: "12" });

    expect(isIndexableAddressFeature(feature)).toBe(true);
  });

  it("returns false when a feature has no street or number", () => {
    const feature = createFeature({ street: "", number: "" });

    expect(isIndexableAddressFeature(feature)).toBe(false);
  });
});
