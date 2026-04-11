import { resolvePreorderLineItemPrice } from "../resolve-preorder-line-item-price";

describe("resolvePreorderLineItemPriceStep", () => {
  it("returns null for non-preorder variants", async () => {
    const result = resolvePreorderLineItemPrice({
      currency_code: "aud",
      variant: {
        id: "variant_1",
      },
    });

    expect(result).toBeNull();
  });

  it("returns the matching preorder price for the cart currency", async () => {
    const result = resolvePreorderLineItemPrice({
      currency_code: "nzd",
      variant: {
        id: "variant_1",
        preorder_variant: {
          status: "enabled",
          available_date: "2999-01-01T00:00:00.000Z",
          prices: [
            { currency_code: "aud", amount: 139 },
            { currency_code: "nzd", amount: 149 },
          ],
        },
      },
    });

    expect(result).toBe(149);
  });

  it("throws when preorder pricing is missing for the cart currency", () => {
    expect(() =>
      resolvePreorderLineItemPrice({
        currency_code: "usd",
        variant: {
          id: "variant_1",
          preorder_variant: {
            status: "enabled",
            available_date: "2999-01-01T00:00:00.000Z",
            prices: [{ currency_code: "aud", amount: 139 }],
          },
        },
      })
    ).toThrow("Pre-order price is not configured for currency USD");
  });
});
