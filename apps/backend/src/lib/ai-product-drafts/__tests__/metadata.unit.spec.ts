import { mergeAiProductDraftMetadata } from "../metadata"

describe("mergeAiProductDraftMetadata", () => {
  it("preserves unrelated metadata and replaces only AI-ready namespaces", () => {
    expect(
      mergeAiProductDraftMetadata(
        {
          legacy_flag: true,
          ai_core: { schema_version: 1, product_kind: "old" },
          three_d_printing: { schema_version: 1, material: "PLA" },
        },
        {
          ai_core: {
            schema_version: 1,
            product_kind: "filament",
            ai_search_keywords: ["petg"],
          },
          three_d_printing: {
            schema_version: 1,
            material: "PETG",
          },
        }
      )
    ).toEqual({
      legacy_flag: true,
      ai_core: {
        schema_version: 1,
        product_kind: "filament",
        ai_search_keywords: ["petg"],
      },
      three_d_printing: {
        schema_version: 1,
        material: "PETG",
      },
    })
  })
})
