import { normalizeOptimizableImageUrl } from "../optimizable-url"

describe("normalizeOptimizableImageUrl", () => {
  it("converts default placehold.co SVG placeholders to PNG URLs", () => {
    expect(
      normalizeOptimizableImageUrl(
        "https://placehold.co/900x900?text=AI+PETG+Black"
      )
    ).toBe("https://placehold.co/900x900/png?text=AI+PETG+Black")
  })

  it("preserves existing raster placehold.co URLs", () => {
    expect(
      normalizeOptimizableImageUrl(
        "https://placehold.co/900x900.jpg?text=AI+PETG+Black"
      )
    ).toBe("https://placehold.co/900x900.jpg?text=AI+PETG+Black")
    expect(
      normalizeOptimizableImageUrl(
        "https://placehold.co/900x900/png?text=AI+PETG+Black"
      )
    ).toBe("https://placehold.co/900x900/png?text=AI+PETG+Black")
  })

  it("leaves non-placeholder and relative image URLs unchanged", () => {
    expect(normalizeOptimizableImageUrl("/placeholder.png")).toBe(
      "/placeholder.png"
    )
    expect(normalizeOptimizableImageUrl("https://example.com/photo.svg")).toBe(
      "https://example.com/photo.svg"
    )
  })
})
