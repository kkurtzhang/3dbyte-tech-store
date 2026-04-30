import { hasRequiredRateAddress } from "../route";

describe("store shipping-rates route helpers", () => {
  it("requires city, postal code, and country before calling Karrio", () => {
    expect(
      hasRequiredRateAddress({
        city: "Wollongong",
        country_code: "AU",
        postal_code: "2500",
      })
    ).toBe(true);

    expect(
      hasRequiredRateAddress({
        city: "Wollongong",
        country_code: "AU",
      })
    ).toBe(false);

    expect(
      hasRequiredRateAddress({
        country_code: "AU",
        postal_code: "2500",
      })
    ).toBe(false);
  });
});
