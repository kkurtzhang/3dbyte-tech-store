import {
  DEFAULT_COUNTRY_CODE,
  DEFAULT_CURRENCY_CODE,
  findRegionByCountry,
  findRegionById,
  getPricingContextFromRegion,
  parseRegionCookieHeader,
  selectRegionForPricing,
} from "../regions"

const auRegion = {
  id: "reg_au",
  name: "Australia",
  currency_code: "AUD",
  countries: [{ iso_2: "AU" }],
}

const nzRegion = {
  id: "reg_nz",
  name: "New Zealand",
  currency_code: "nzd",
  countries: [{ iso_2: "nz" }],
}

describe("region helpers", () => {
  it("uses Australia as the launch default", () => {
    expect(DEFAULT_COUNTRY_CODE).toBe("au")
    expect(DEFAULT_CURRENCY_CODE).toBe("aud")
    expect(findRegionByCountry([nzRegion, auRegion])).toEqual(auRegion)
  })

  it("resolves New Zealand by country code using normalized input", () => {
    expect(findRegionByCountry([auRegion, nzRegion], "NZ")).toEqual(nzRegion)
  })

  it("resolves selected regions by id", () => {
    expect(findRegionById([auRegion, nzRegion], "reg_nz")).toEqual(nzRegion)
  })

  it("lets explicit country requests override stale selected-region cookies", () => {
    expect(
      selectRegionForPricing({
        regions: [auRegion, nzRegion],
        selectedRegionId: "reg_au",
        countryCode: "nz",
        preferCountry: true,
      })
    ).toEqual(nzRegion)
  })

  it("builds pricing context from a Medusa region and country", () => {
    expect(getPricingContextFromRegion(nzRegion, "NZ")).toEqual({
      region_id: "reg_nz",
      country_code: "nz",
      currency_code: "nzd",
    })
  })

  it("parses client cookie headers into pricing context hints", () => {
    expect(
      parseRegionCookieHeader(
        "_medusa_region_id=reg_nz; _medusa_country_code=NZ; _medusa_currency_code=NZD"
      )
    ).toEqual({
      region_id: "reg_nz",
      country_code: "nz",
      currency_code: "nzd",
    })
  })
})
