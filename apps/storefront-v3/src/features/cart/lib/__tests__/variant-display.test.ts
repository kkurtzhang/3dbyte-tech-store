import { getCartItemVariantTitle, getNormalizedVariantTitle } from "../variant-display"

describe("getNormalizedVariantTitle", () => {
  it("returns a trimmed variant title when it is meaningful", () => {
    expect(getNormalizedVariantTitle("  Matte Black  ")).toBe("Matte Black")
  })

  it("returns null for default variant placeholders", () => {
    expect(getNormalizedVariantTitle("Default")).toBeNull()
    expect(getNormalizedVariantTitle("Default Variant")).toBeNull()
    expect(getNormalizedVariantTitle("Default Title")).toBeNull()
  })

  it("returns null for empty variant titles", () => {
    expect(getNormalizedVariantTitle("   ")).toBeNull()
    expect(getNormalizedVariantTitle(undefined)).toBeNull()
    expect(getNormalizedVariantTitle(null)).toBeNull()
  })
})

describe("getCartItemVariantTitle", () => {
  it("prefers the line-item variant title", () => {
    expect(
      getCartItemVariantTitle({
        variant_title: "Power Tool Green",
        subtitle: "Power Tool Green",
        variant: {
          title: "Default Variant",
        },
      })
    ).toBe("Power Tool Green")
  })

  it("falls back to the subtitle when variant_title is default", () => {
    expect(
      getCartItemVariantTitle({
        variant_title: "Default Title",
        subtitle: "Black - 180",
        variant: {
          title: "Default Variant",
        },
      })
    ).toBe("Black - 180")
  })

  it("falls back to the nested variant title last", () => {
    expect(
      getCartItemVariantTitle({
        variant_title: "Default Title",
        subtitle: null,
        variant: {
          title: "Matte Black",
        },
      })
    ).toBe("Matte Black")
  })
})
