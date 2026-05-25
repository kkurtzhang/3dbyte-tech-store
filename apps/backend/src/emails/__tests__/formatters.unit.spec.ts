import {
  formatEmailAddress,
  formatEmailDate,
  formatEmailMoney,
} from "../formatters";

describe("email formatters", () => {
  it("formats Medusa major-unit AUD amounts for customer emails", () => {
    expect(formatEmailMoney(250.49, "aud")).toBe("A$250.49");
  });

  it("formats zero-decimal currencies without cents", () => {
    expect(formatEmailMoney(1234, "JPY")).toBe("¥1,234");
  });

  it("formats missing or invalid amounts as zero instead of NaN", () => {
    expect(formatEmailMoney(undefined, "AUD")).toBe("A$0.00");
    expect(formatEmailMoney(Number.NaN, "AUD")).toBe("A$0.00");
  });

  it("formats zero amounts explicitly", () => {
    expect(formatEmailMoney(0, "AUD")).toBe("A$0.00");
  });

  it("formats order dates in Australian English", () => {
    expect(formatEmailDate("2026-05-05T08:00:00.000Z")).toContain("2026");
  });

  it("formats a multiline shipping address", () => {
    expect(
      formatEmailAddress({
        first_name: "Ada",
        last_name: "Lovelace",
        address_1: "1 Test Street",
        address_2: "Unit 2",
        city: "Hobart",
        province: "TAS",
        postal_code: "7000",
        country_code: "au",
      }),
    ).toEqual([
      "Ada Lovelace",
      "1 Test Street",
      "Unit 2",
      "Hobart TAS 7000",
      "Australia",
    ]);
  });
});
