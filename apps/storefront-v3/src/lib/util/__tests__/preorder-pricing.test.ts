import { getVariantPriceDisplay, resolvePreorderPrice } from "../preorder-pricing"

describe("resolvePreorderPrice", () => {
  it("returns the preorder price for the active currency", () => {
    expect(
      resolvePreorderPrice(
        {
          preorder_variant: {
            prices: [
              { amount: 80, currency_code: "usd" },
              { amount: 120, currency_code: "aud" },
            ],
          },
        },
        "aud"
      )
    ).toEqual({ amount: 120, currency_code: "aud" })
  })

  it("falls back to the first preorder price when the currency is missing", () => {
    expect(
      resolvePreorderPrice({
        preorder_variant: {
          prices: [{ amount: 80, currency_code: "usd" }],
        },
      })
    ).toEqual({ amount: 80, currency_code: "usd" })
  })
})

describe("getVariantPriceDisplay", () => {
  it("returns sale pricing when a variant is discounted", () => {
    expect(
      getVariantPriceDisplay({
        calculated_price: {
          calculated_amount: 100,
          original_amount: 120,
          currency_code: "usd",
        },
        prices: [{ amount: 120, currency_code: "usd" }],
      })
    ).toEqual({
      price: { amount: 100, currency_code: "usd" },
      originalPrice: 120,
      discountPercentage: 17,
    })
  })

  it("falls back to sale pricing when no preorder price is present", () => {
    expect(
      getVariantPriceDisplay({
        calculated_price: {
          calculated_amount: 75,
          original_amount: 100,
          currency_code: "aud",
        },
        prices: [{ amount: 100, currency_code: "aud" }],
      })
    ).toEqual({
      price: { amount: 75, currency_code: "aud" },
      originalPrice: 100,
      discountPercentage: 25,
    })
  })
})
