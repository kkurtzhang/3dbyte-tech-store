import { toMedusaMajorUnitAmount } from "../smart-import";

describe("smart import price normalization", () => {
  it("keeps source prices in Medusa v2 major units", () => {
    expect(toMedusaMajorUnitAmount(19.95)).toBe(19.95);
    expect(toMedusaMajorUnitAmount("24.50")).toBe(24.5);
    expect(toMedusaMajorUnitAmount(undefined)).toBe(0);
  });
});
