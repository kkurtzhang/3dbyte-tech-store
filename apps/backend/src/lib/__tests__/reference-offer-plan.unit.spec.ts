const {
  buildReferenceOfferPlan,
} = require("../../../scripts/reference-offer-plan.cjs");
const fixture = require("../../../../../docs/hermes/fixtures/reference-prices-2026-10-08.json");
const stock = require("../../../../../docs/hermes/fixtures/reference-stock-plan-2026-10-08.json");
const now = Date.parse("2026-10-08T21:00:00Z");
const env = {
  APP_ENV: "staging",
  STRIPE_SECRET_KEY: "sk_test_fixture",
  NEXT_PUBLIC_STRIPE_KEY: "pk_test_fixture",
  MEDUSA_BACKEND_URL: "https://api.staging.3dbytetech.com.au",
  STORE_CORS: "https://store.staging.3dbytetech.com.au",
};
const copy = () => JSON.parse(JSON.stringify(fixture));
const build = (input = copy(), plan = stock, runtime = env, time = now) =>
  buildReferenceOfferPlan(input, plan, runtime, time);

describe("source-bound realistic staging reference prices", () => {
  it("uses AUD major units exactly, preserves simulation including zero and never activates offers", () => {
    const before = JSON.stringify(fixture);
    const result = build(fixture);
    expect(result).toMatchObject({
      scope: "staging",
      real_stock: false,
      applied: false,
      checkout_enabled: false,
    });
    expect(
      result.entries.map((entry: { prices: unknown }) => entry.prices),
    ).toEqual([
      [{ currency_code: "aud", amount: 58.45 }],
      [{ currency_code: "aud", amount: 35.95 }],
      [{ currency_code: "aud", amount: 76.12 }],
      [{ currency_code: "aud", amount: 26.95 }],
    ]);
    expect(
      result.entries.map(
        (entry: { simulated_quantity: number }) => entry.simulated_quantity,
      ),
    ).toEqual([28, 4, 0, 12]);
    expect(
      result.entries.every(
        (entry: {
          native_variant_id: unknown;
          required_tax_inclusive: boolean;
        }) => entry.native_variant_id === null && entry.required_tax_inclusive,
      ),
    ).toBe(true);
    expect(JSON.stringify(fixture)).toBe(before);
    expect(
      build({ ...fixture, observations: [...fixture.observations].reverse() }),
    ).toEqual(result);
  });
  it.each([
    null,
    "",
    "0.00",
    "-1.00",
    "26.955",
    26.95,
    "2695",
    "26.95 delivery",
  ])("rejects missing or guessed/non-unit amount %p", (amount) => {
    const data = copy();
    data.observations[2].observed_unit_amount = amount;
    expect(() => build(data)).toThrow();
  });
  it.each([
    ["currency", "USD"],
    ["retailer_private_label", true],
    ["manufacturer_brand", "DREMC"],
    ["retailer_variant_id", "other"],
    ["manufacturer_part_number", "4001030147"],
    [
      "variant_url",
      "https://store.dremc.com.au/products/other?variant=43555662266537",
    ],
    ["observed_unit_amount", "12.00"],
    ["packet_sha256", "b".repeat(64)],
    ["gst_explicitly_stated", false],
    ["gst_included", false],
    ["shipping_included", true],
    ["regular_amount", "99.99"],
    ["checked_at", "2026-10-10T00:00:00Z"],
    ["checked_at", "2026-10-06T20:00:00Z"],
    ["checked_at", "invalid"],
  ])(
    "rejects conflicting, stale or incomplete provenance: %s",
    (field, value) => {
      const data = copy();
      data.observations[0][field] = value;
      expect(() => build(data)).toThrow();
    },
  );
  it("requires the exact old filament barcode and excludes hidden discontinued dryer pricing", () => {
    const data = copy();
    data.observations[2].gtin = "6938936714927";
    expect(() => build(data)).toThrow();
    const dryer = copy();
    dryer.observations[3].retailer = "DREMC";
    expect(() => build(dryer)).toThrow();
  });
  it("retains observed retailer availability separately from simulated business inventory", () => {
    const result = build();
    expect(result.entries[0]).toMatchObject({
      retailer_availability: "sold_out",
      simulated_quantity: 28,
    });
    expect(result.entries[1]).toMatchObject({
      observed_retailer_quantity: 7,
      simulated_quantity: 4,
    });
    expect(result.entries[3]).toMatchObject({
      observed_retailer_quantity: 5,
      simulated_quantity: 12,
    });
    expect(result.entries[2]).toMatchObject({
      retailer_availability: "out_of_stock",
      simulated_quantity: 0,
    });
  });
  it("fails closed on incomplete/duplicate evidence, stock conflicts and non-test runtime", () => {
    const short = copy();
    short.observations.pop();
    expect(() => build(short)).toThrow();
    const duplicate = copy();
    duplicate.observations[3] = duplicate.observations[0];
    expect(() => build(duplicate)).toThrow();
    for (const plan of [
      { ...stock, applied: true },
      { ...stock, scope: "production" },
      { ...stock, real_stock: true },
      { ...stock, entries: stock.entries.slice(1) },
      {
        ...stock,
        entries: stock.entries.map((e: unknown) => ({
          ...(e as object),
          quantity: 31,
        })),
      },
    ])
      expect(() => build(copy(), plan)).toThrow();
    for (const runtime of [
      { ...env, STRIPE_SECRET_KEY: "sk_live_fixture" },
      { ...env, APP_ENV: "production" },
    ])
      expect(() => build(copy(), stock, runtime)).toThrow();
    expect(() => build(null)).toThrow();
  });
});
