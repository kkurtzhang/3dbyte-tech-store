import {
  getPrimaryShippingEstimate,
  isValidAustralianPostcode,
  normalizePostcodeInput,
  sortShippingEstimateOptions,
  type ProductShippingEstimateOption,
} from "../product-shipping-estimate"

const options: ProductShippingEstimateOption[] = [
  {
    id: "express",
    name: "Express Shipping",
    description: "1-2 business days",
    amount: 19.95,
    currencyCode: "aud",
    priceType: "calculated",
  },
  {
    id: "standard",
    name: "Standard Shipping",
    description: "2-5 business days",
    amount: 9.95,
    currencyCode: "aud",
    priceType: "flat",
  },
  {
    id: "pickup",
    name: "Warehouse Pickup",
    description: "Collect from Hobart",
    amount: 0,
    currencyCode: "aud",
    priceType: "flat",
  },
]

describe("product shipping estimate helpers", () => {
  it("normalizes postcode input by stripping whitespace", () => {
    expect(normalizePostcodeInput(" 70 00 ")).toBe("7000")
  })

  it("accepts valid Australian postcodes", () => {
    expect(isValidAustralianPostcode("7000")).toBe(true)
    expect(isValidAustralianPostcode(" 3000 ")).toBe(true)
  })

  it("rejects invalid Australian postcodes", () => {
    expect(isValidAustralianPostcode("700")).toBe(false)
    expect(isValidAustralianPostcode("70000")).toBe(false)
    expect(isValidAustralianPostcode("H700")).toBe(false)
  })

  it("sorts shipping options from cheapest to most expensive", () => {
    expect(sortShippingEstimateOptions(options).map((option) => option.id)).toEqual([
      "pickup",
      "standard",
      "express",
    ])
  })

  it("returns the cheapest option as the primary estimate", () => {
    expect(getPrimaryShippingEstimate(options)).toEqual(options[2])
  })
})
