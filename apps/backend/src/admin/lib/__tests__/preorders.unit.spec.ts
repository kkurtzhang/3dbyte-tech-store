import {
  buildPriceInputMap,
  formatPreorderDate,
  formatMoneyAmount,
  getCurrencyCodes,
  isEnabledPreorderVariant,
  parsePriceInputs,
  parseNumberInputValue,
  toNumberInputValue,
  toDateTimeLocalValue,
} from "../preorders";

describe("preorder admin helpers", () => {
  it("formats preorder dates for display", () => {
    expect(formatPreorderDate("2026-04-01T12:00:00.000Z")).toBe("April 1, 2026");
  });

  it("detects enabled preorder variants", () => {
    expect(
      isEnabledPreorderVariant({
        id: "pre_1",
        variant_id: "variant_1",
        available_date: "2026-04-01T12:00:00.000Z",
        prices: [{ currency_code: "aud", amount: 129.99 }],
        status: "enabled",
      })
    ).toBe(true);
  });

  it("treats disabled preorder variants as inactive", () => {
    expect(
      isEnabledPreorderVariant({
        id: "pre_1",
        variant_id: "variant_1",
        available_date: "2026-04-01T12:00:00.000Z",
        prices: [{ currency_code: "aud", amount: 129.99 }],
        status: "disabled",
      })
    ).toBe(false);
  });

  it("produces a datetime-local value", () => {
    const value = toDateTimeLocalValue(new Date("2026-04-01T12:34:56.000Z"));

    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("formats numeric preorder values for inputs", () => {
    expect(toNumberInputValue(12999)).toBe("12999");
    expect(toNumberInputValue(null)).toBe("");
  });

  it("parses numeric preorder input values", () => {
    expect(parseNumberInputValue("12999")).toBe(12999);
    expect(parseNumberInputValue("")).toBeUndefined();
  });

  it("collects currency codes from regular and preorder prices", () => {
    expect(
      getCurrencyCodes(
        [{ currency_code: "nzd", amount: 149 }],
        [{ currency_code: "aud", amount: 139 }]
      )
    ).toEqual(["aud", "nzd"]);
  });

  it("builds preorder price input maps", () => {
    expect(
      buildPriceInputMap(["aud", "nzd"], [
        { currency_code: "aud", amount: 139 },
        { currency_code: "nzd", amount: 149 },
      ])
    ).toEqual({
      aud: "139",
      nzd: "149",
    });
  });

  it("parses preorder price inputs by currency", () => {
    expect(parsePriceInputs({ aud: "139", nzd: "149" }, ["aud", "nzd"])).toEqual({
      prices: [
        { currency_code: "aud", amount: 139 },
        { currency_code: "nzd", amount: 149 },
      ],
      missingCurrencyCodes: [],
    });
  });

  it("formats currency amounts for display", () => {
    expect(formatMoneyAmount(139, "aud")).toBe("A$139.00");
  });
});
