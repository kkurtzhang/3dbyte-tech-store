import { normalizeProductResearchPacket } from "../normalizer"
import { ProductResearchPacketSchema } from "../schemas"

const basePacket = {
  packet_version: 1,
  source_agent: "hermes",
  product_id: "prod_123",
  product_handle: "example-petg",
  product_input: {
    brand: "Example",
    product_name: "Example PETG",
    colour: "Black",
    diameter_mm: 1.75,
    spool_weight_g: 1000,
    supplier_url: "https://supplier.example/products/example-petg",
  },
  source_summary: {
    official_product_page: "https://manufacturer.example/example-petg",
    official_tds: "https://manufacturer.example/example-petg-tds.pdf",
    official_sds: "",
    trusted_supplier_pages: [],
  },
  facts: {
    material: {
      value: "PETG",
      source_url: "https://manufacturer.example/example-petg",
      source_type: "official_product_page",
      confidence: 0.96,
    },
    recommended_nozzle_temp_c: {
      min: 230,
      max: 250,
      source_url: "https://manufacturer.example/example-petg-tds.pdf",
      source_type: "official_tds",
      confidence: 0.92,
      warning: "",
    },
    recommended_bed_temp_c: {
      min: 70,
      max: 85,
      source_url: "https://manufacturer.example/example-petg-tds.pdf",
      source_type: "official_tds",
      confidence: 0.9,
      warning: "",
    },
    requires_enclosure: {
      value: false,
      source_url: "https://manufacturer.example/example-petg",
      source_type: "official_product_page",
      confidence: 0.82,
    },
    drying_recommended: {
      value: true,
      source_url: "https://manufacturer.example/example-petg-tds.pdf",
      source_type: "official_tds",
      confidence: 0.88,
    },
  },
  draft_content: {
    short_description: "A source-backed PETG filament draft.",
    feature_bullets: ["1.75 mm PETG filament"],
    seo_title: "Example PETG Filament",
    seo_description: "Example PETG filament for functional 3D prints.",
    ai_search_keywords: ["petg filament", "functional filament"],
  },
  related_content_suggestions: [],
  sources: [
    {
      url: "https://manufacturer.example/example-petg",
      source_type: "manufacturer_official",
      title: "Example PETG",
      retrieved_at: "2026-06-28T00:00:00.000Z",
      notes: "Official product page.",
    },
  ],
  warnings: [],
}

describe("normalizeProductResearchPacket", () => {
  it("maps source-backed packet facts into internal AI-ready metadata", () => {
    const packet = ProductResearchPacketSchema.parse(basePacket)
    const draft = normalizeProductResearchPacket(packet)

    expect(draft.metadata.ai_core?.product_kind).toBe("filament")
    expect(draft.metadata.three_d_printing?.material).toBe("PETG")
    expect(draft.metadata.three_d_printing?.diameter_mm).toBe(1.75)
    expect(draft.metadata.three_d_printing?.recommended_nozzle_temp_c).toEqual({
      min: 230,
      max: 250,
    })
    expect(draft.claim_evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          claim_path: "metadata.three_d_printing.material",
          source_url: "https://manufacturer.example/example-petg",
        }),
      ])
    )
  })

  it("turns evidence-free facts into warnings instead of metadata", () => {
    const packet = ProductResearchPacketSchema.parse({
      ...basePacket,
      facts: {
        ...basePacket.facts,
        requires_enclosure: {
          value: true,
          source_url: "",
          source_type: "",
          confidence: 0.6,
        },
      },
    })

    const draft = normalizeProductResearchPacket(packet)

    expect(draft.metadata.three_d_printing?.requires_enclosure).toBeUndefined()
    expect(draft.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("requires_enclosure"),
      ])
    )
  })
})
