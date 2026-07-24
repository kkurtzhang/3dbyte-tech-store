import {
  InternalAiProductDraftSchema,
  ProductResearchPacketV1Schema,
  ProductResearchPacketV2Schema,
  ProductResearchPacketSchema,
} from "../schemas"

const validPacket = {
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
    official_sds: "https://manufacturer.example/example-petg-sds.pdf",
    trusted_supplier_pages: ["https://supplier.example/products/example-petg"],
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
    feature_bullets: ["1.75 mm PETG filament", "Dry before critical prints"],
    seo_title: "Example PETG Filament",
    seo_description: "Example PETG filament for functional 3D prints.",
    ai_search_keywords: ["petg filament", "1.75mm petg"],
  },
  related_content_suggestions: [
    {
      handle: "how-to-dry-filament",
      reason: "Drying is recommended by the TDS.",
      confidence: 0.8,
    },
  ],
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

describe("Product Research Packet schema", () => {
  it("accepts a source-backed Hermes packet", () => {
    const parsed = ProductResearchPacketSchema.parse(validPacket)

    expect(parsed.packet_version).toBe(1)
    expect(parsed.source_agent).toBe("hermes")
    expect(parsed.facts.material.value).toBe("PETG")
  })

  it("rejects unknown fields and invalid confidence", () => {
    const result = ProductResearchPacketSchema.safeParse({
      ...validPacket,
      unexpected_customer_email: "customer@example.com",
      facts: {
        ...validPacket.facts,
        material: {
          ...validPacket.facts.material,
          confidence: 1.4,
        },
      },
    })

    expect(result.success).toBe(false)
  })

  it("accepts a v2 create-or-enrich packet with stable identity", () => {
    const parsed = ProductResearchPacketV2Schema.parse({
      ...validPacket,
      packet_version: 2,
      request_id: "hermes:example-petg:2026-07-24",
      requested_operation: "auto",
      product_id: "",
      product_handle: "",
      product_input: {
        ...validPacket.product_input,
        manufacturer_part_number: "EX-PETG-BLK-175-1KG",
        gtin: "",
        supplier_sku: "SUP-123",
      },
    })

    expect(parsed.packet_version).toBe(2)
    expect(parsed.requested_operation).toBe("auto")
    expect(parsed.product_input.manufacturer_part_number).toBe(
      "EX-PETG-BLK-175-1KG"
    )
  })

  it("keeps v1 packets parseable while distinguishing their contract version", () => {
    expect(ProductResearchPacketV1Schema.parse(validPacket).packet_version).toBe(
      1
    )
    expect(
      ProductResearchPacketSchema.parse({
        ...validPacket,
        packet_version: 2,
        request_id: "hermes:example-petg:2026-07-24",
        requested_operation: "enrich",
        product_input: {
          ...validPacket.product_input,
          manufacturer_part_number: "",
          gtin: "",
          supplier_sku: "",
        },
      }).packet_version
    ).toBe(2)
  })
})

describe("Internal AI Product Draft schema", () => {
  it("accepts internal drafts that use existing AI-ready metadata families", () => {
    const parsed = InternalAiProductDraftSchema.parse({
      schema_version: 1,
      target_product: {
        product_id: "prod_123",
        product_handle: "example-petg",
      },
      metadata: {
        ai_core: {
          schema_version: 1,
          product_kind: "filament",
          ai_search_keywords: ["petg filament"],
        },
        three_d_printing: {
          schema_version: 1,
          product_kind: "filament",
          material: "PETG",
          diameter_mm: 1.75,
          recommended_nozzle_temp_c: { min: 230, max: 250 },
          drying_recommended: true,
        },
      },
      content_draft: {
        short_description: "A source-backed PETG filament draft.",
        feature_bullets: ["1.75 mm PETG filament"],
        seo_title: "Example PETG Filament",
        seo_description: "Example PETG filament for functional 3D prints.",
        ai_search_keywords: ["petg filament"],
      },
      related_content_suggestions: [],
      product_document_suggestions: [],
      claim_evidence: [
        {
          claim_path: "metadata.three_d_printing.material",
          value: "PETG",
          source_url: "https://manufacturer.example/example-petg",
          source_type: "official_product_page",
          confidence: 0.96,
        },
      ],
      warnings: [],
      confidence_summary: {
        overall: 0.9,
        metadata: 0.92,
        content: 0.8,
        documents: 0.7,
      },
    })

    expect(parsed.metadata.three_d_printing?.material).toBe("PETG")
  })
})
