import {
  getLocalitySuggestionsFromAddresses,
  getLocalitySuggestionsFromLocalities,
  getPrimaryShippingEstimate,
  inferAustralianStateFromPostcode,
  isValidAustralianPostcode,
  minorUnitAmountToMajorUnitAmount,
  normalizeLocalityInput,
  normalizePostcodeInput,
  parseShippingDestinationInput,
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

  it("normalizes locality input whitespace", () => {
    expect(normalizeLocalityInput("  New   Town ")).toBe("New Town")
  })

  it("converts Medusa minor-unit shipping amounts to display amounts", () => {
    expect(minorUnitAmountToMajorUnitAmount(1119, "AUD")).toBe(11.19)
    expect(minorUnitAmountToMajorUnitAmount(1779, "aud")).toBe(17.79)
    expect(minorUnitAmountToMajorUnitAmount(1200, "JPY")).toBe(1200)
  })

  it("parses combined suburb and postcode input", () => {
    expect(parseShippingDestinationInput("Wollongong NSW 2500")).toEqual({
      postalCode: "2500",
      locality: "Wollongong",
    })
    expect(parseShippingDestinationInput("2500 Wollongong")).toEqual({
      postalCode: "2500",
      locality: "Wollongong",
    })
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

  it("infers Australian state codes from postcode ranges", () => {
    expect(inferAustralianStateFromPostcode("2500")).toBe("NSW")
    expect(inferAustralianStateFromPostcode("7008")).toBe("TAS")
    expect(inferAustralianStateFromPostcode("3000")).toBe("VIC")
    expect(inferAustralianStateFromPostcode("0800")).toBe("NT")
    expect(inferAustralianStateFromPostcode("2600")).toBe("ACT")
  })

  it("builds unique suburb suggestions from address search results", () => {
    expect(
      getLocalitySuggestionsFromAddresses(
        [
          {
            id: "addr_1",
            full_address: "40 Crown Street, Wollongong, NSW, 2500",
            unit: "",
            number: "40",
            street: "Crown Street",
            suburb: "Wollongong",
            state: "nsw",
            postcode: "2500",
            country: "au",
          },
          {
            id: "addr_2",
            full_address: "42 Crown Street, Wollongong, NSW, 2500",
            unit: "",
            number: "42",
            street: "Crown Street",
            suburb: "Wollongong",
            state: "NSW",
            postcode: "2500",
            country: "AU",
          },
          {
            id: "addr_3",
            full_address: "1 Elizabeth Street, Hobart, TAS, 7000",
            unit: "",
            number: "1",
            street: "Elizabeth Street",
            suburb: "Hobart",
            state: "TAS",
            postcode: "7000",
            country: "AU",
          },
        ],
        "2500"
      )
    ).toEqual([
      {
        id: "wollongong|NSW|2500|AU",
        label: "Wollongong NSW 2500",
        suburb: "Wollongong",
        state: "NSW",
        postcode: "2500",
        country: "AU",
      },
    ])
  })

  it("builds suburb suggestions from locality search results", () => {
    expect(
      getLocalitySuggestionsFromLocalities(
        [
          {
            id: "au_nsw_2500_wollongong",
            display_name: "Wollongong, NSW 2500",
            locality: "Wollongong",
            state: "nsw",
            postcode: "2500",
            country: "au",
          },
          {
            id: "au_tas_7000_hobart",
            display_name: "Hobart, TAS 7000",
            locality: "Hobart",
            state: "TAS",
            postcode: "7000",
            country: "AU",
          },
        ],
        "2500"
      )
    ).toEqual([
      {
        id: "au_nsw_2500_wollongong",
        label: "Wollongong NSW 2500",
        suburb: "Wollongong",
        state: "NSW",
        postcode: "2500",
        country: "AU",
      },
    ])
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
