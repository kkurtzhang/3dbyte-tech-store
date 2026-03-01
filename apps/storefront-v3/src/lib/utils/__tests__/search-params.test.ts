import {
  copyDynamicOptionParams,
  hasDynamicOptionParams,
  parseDynamicOptionParams,
} from "../search-params"

describe("search params utilities", () => {
  describe("parseDynamicOptionParams", () => {
    it("parses options_* query params into option arrays", () => {
      const result = parseDynamicOptionParams({
        options_colour: "Black,White",
        options_size: "S,M",
      })

      expect(result).toEqual({
        colour: ["Black", "White"],
        size: ["S", "M"],
      })
    })

    it("ignores non-options keys and empty values", () => {
      const result = parseDynamicOptionParams({
        q: "printer",
        options_colour: "",
        options_size: ",M,,",
      })

      expect(result).toEqual({
        size: ["M"],
      })
    })
  })

  describe("hasDynamicOptionParams", () => {
    it("returns true when at least one options_* key exists", () => {
      expect(hasDynamicOptionParams({ options_colour: "Black" })).toBe(true)
    })

    it("returns false when no options_* keys exist", () => {
      expect(hasDynamicOptionParams({ q: "printer", sort: "newest" })).toBe(false)
    })
  })

  describe("copyDynamicOptionParams", () => {
    it("copies only populated options_* params to target", () => {
      const target: Record<string, string | undefined> = {
        q: "printer",
      }

      copyDynamicOptionParams(
        {
          options_colour: "Black,White",
          options_size: "",
          page: "2",
        },
        target
      )

      expect(target).toEqual({
        q: "printer",
        options_colour: "Black,White",
      })
    })
  })
})
