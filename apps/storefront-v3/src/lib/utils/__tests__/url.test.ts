import {
  buildShopQueryString,
  parseShopQueryString,
  buildShopUrl,
  type ShopQueryParams,
} from "../url"

describe("url utilities", () => {
  describe("buildShopQueryString", () => {
    it("returns empty string for empty params", () => {
      const result = buildShopQueryString({})
      expect(result).toBe("")
    })

    it("builds query string with search query", () => {
      const result = buildShopQueryString({ q: "printer" })
      expect(result).toBe("?q=printer")
    })

    it("builds query string with multiple params", () => {
      const result = buildShopQueryString({
        q: "printer",
        category: "3d-printers",
        brand: "prusa",
      })
      expect(result).toContain("q=printer")
      expect(result).toContain("category=3d-printers")
      expect(result).toContain("brand=prusa")
    })

    it("excludes page 1 from query string", () => {
      const result = buildShopQueryString({ page: 1 })
      expect(result).toBe("")
    })

    it("includes page number when greater than 1", () => {
      const result = buildShopQueryString({ page: 2 })
      expect(result).toBe("?page=2")
    })

    it("handles dynamic options (e.g., options_colour)", () => {
      const params: ShopQueryParams = {
        options_colour: "red",
        options_size: "large",
      }
      const result = buildShopQueryString(params)
      expect(result).toContain("options_colour=red")
      expect(result).toContain("options_size=large")
    })

    it("handles price range filters", () => {
      const result = buildShopQueryString({
        minPrice: "100",
        maxPrice: "500",
      })
      expect(result).toContain("minPrice=100")
      expect(result).toContain("maxPrice=500")
    })

    it("handles boolean filters", () => {
      const result = buildShopQueryString({
        onSale: "true",
        inStock: "true",
      })
      expect(result).toContain("onSale=true")
      expect(result).toContain("inStock=true")
    })

    it("handles sort parameter", () => {
      const result = buildShopQueryString({ sort: "price_asc" })
      expect(result).toBe("?sort=price_asc")
    })

    it("encodes special characters in values", () => {
      const result = buildShopQueryString({ q: "3d printer & accessories" })
      expect(result).toBe("?q=3d+printer+%26+accessories")
    })
  })

  describe("parseShopQueryString", () => {
    it("parses empty search params", () => {
      const searchParams = new URLSearchParams()
      const result = parseShopQueryString(searchParams)
      expect(result).toEqual({
        q: undefined,
        category: undefined,
        collection: undefined,
        brand: undefined,
        onSale: undefined,
        inStock: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        sort: undefined,
        page: undefined,
      })
    })

    it("parses search query", () => {
      const searchParams = new URLSearchParams("q=printer")
      const result = parseShopQueryString(searchParams)
      expect(result.q).toBe("printer")
    })

    it("parses multiple params", () => {
      const searchParams = new URLSearchParams(
        "q=printer&category=3d-printers&brand=prusa"
      )
      const result = parseShopQueryString(searchParams)
      expect(result.q).toBe("printer")
      expect(result.category).toBe("3d-printers")
      expect(result.brand).toBe("prusa")
    })

    it("parses dynamic options", () => {
      const searchParams = new URLSearchParams(
        "options_colour=red&options_size=large"
      )
      const result = parseShopQueryString(searchParams)
      expect(result.options_colour).toBe("red")
      expect(result.options_size).toBe("large")
    })

    it("parses price range", () => {
      const searchParams = new URLSearchParams("minPrice=100&maxPrice=500")
      const result = parseShopQueryString(searchParams)
      expect(result.minPrice).toBe("100")
      expect(result.maxPrice).toBe("500")
    })
  })

  describe("buildShopUrl", () => {
    it("builds URL with default base path", () => {
      const result = buildShopUrl({ q: "printer" })
      expect(result).toBe("/shop?q=printer")
    })

    it("builds URL with custom base path", () => {
      const result = buildShopUrl({ q: "printer" }, "/brands/prusa")
      expect(result).toBe("/brands/prusa?q=printer")
    })

    it("returns base path without query string for empty params", () => {
      const result = buildShopUrl({})
      expect(result).toBe("/shop")
    })

    it("builds complex URL with multiple params", () => {
      const result = buildShopUrl(
        {
          category: "3d-printers",
          brand: "prusa",
          sort: "price_asc",
          page: 2,
        },
        "/shop"
      )
      expect(result).toContain("/shop?")
      expect(result).toContain("category=3d-printers")
      expect(result).toContain("brand=prusa")
      expect(result).toContain("sort=price_asc")
      expect(result).toContain("page=2")
    })
  })
})
