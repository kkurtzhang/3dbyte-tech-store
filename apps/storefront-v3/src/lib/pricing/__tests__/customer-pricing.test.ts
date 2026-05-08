import {
  formatCustomerPrice,
  isCustomerTaxInclusiveCurrency,
  toCustomerPriceAmount,
} from "../customer-pricing"

describe("customer pricing", () => {
  it("does not add GST again to AUD prices that are already tax inclusive", () => {
    expect(toCustomerPriceAmount(100, "aud")).toBe(100)
    expect(formatCustomerPrice(100, "aud")).toBe("A$100.00")
  })

  it("leaves non-Australian currencies unchanged", () => {
    expect(isCustomerTaxInclusiveCurrency("usd")).toBe(false)
    expect(toCustomerPriceAmount(100, "usd")).toBe(100)
    expect(formatCustomerPrice(100, "usd")).toBe("$100.00")
  })
})
