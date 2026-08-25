import {
  buildAiProductDraftMigrationPlan,
  prepareAiProductDraftMigration,
} from "../migration"

const v2Packet = {
  packet_version: 2,
  request_id: "hermes:cnc-kitchen-tips-v2",
  requested_operation: "create",
  source_agent: "hermes",
  product_id: "",
  product_handle: "cnc-kitchen-soldering-tips-v2",
  product_input: {
    brand: "CNC Kitchen",
    product_name: "CNC Kitchen Soldering Tips V2",
    colour: "",
    diameter_mm: null,
    spool_weight_g: null,
    supplier_url: "https://supplier.example/cnc-kitchen-tips-v2",
    manufacturer_part_number: "",
    gtin: "",
    supplier_sku: "",
  },
  source_summary: {
    official_product_page: "https://manufacturer.example/cnc-kitchen-tips-v2",
    official_tds: "",
    official_sds: "",
    trusted_supplier_pages: [],
  },
  facts: {
    material: {
      value: "",
      source_url: "",
      source_type: "",
      confidence: 0,
    },
    recommended_nozzle_temp_c: {
      min: null,
      max: null,
      source_url: "",
      source_type: "",
      confidence: 0,
    },
    recommended_bed_temp_c: {
      min: null,
      max: null,
      source_url: "",
      source_type: "",
      confidence: 0,
    },
    requires_enclosure: {
      value: null,
      source_url: "",
      source_type: "",
      confidence: 0,
    },
    drying_recommended: {
      value: null,
      source_url: "",
      source_type: "",
      confidence: 0,
    },
  },
  draft_content: {
    short_description: "Replacement soldering tips.",
    feature_bullets: [],
    seo_title: "CNC Kitchen Soldering Tips V2",
    seo_description: "Replacement soldering tips.",
    ai_search_keywords: ["soldering tips"],
  },
  related_content_suggestions: [],
  sources: [
    {
      url: "https://manufacturer.example/cnc-kitchen-tips-v2",
      source_type: "manufacturer_official",
      title: "CNC Kitchen Soldering Tips V2",
      retrieved_at: "2026-07-24T00:00:00.000Z",
      notes: "Official page",
    },
  ],
  warnings: [],
}

describe("AI product draft data migration", () => {
  it("repairs the invalid target selector on failed v2 create packets without mutating raw evidence", () => {
    const rawPacket = structuredClone(v2Packet)
    const prepared = prepareAiProductDraftMigration({
      id: "aipd_v2_failed",
      status: "validation_failed",
      packet_version: 2,
      raw_packet: rawPacket,
      validation_errors: [
        {
          path: "product",
          message:
            "Provided product_id/product_handle does not match an existing product",
        },
      ],
      created_at: "2026-07-24T00:00:00.000Z",
    })

    expect(prepared.kind).toBe("repair_packet")
    expect(prepared.packet).toEqual(
      expect.objectContaining({
        product_id: "",
        product_handle: "",
      })
    )
    expect(rawPacket.product_handle).toBe(
      "cnc-kitchen-soldering-tips-v2"
    )
  })

  it("keeps the oldest exact draft and marks only the newer copy for cleanup", () => {
    const plan = buildAiProductDraftMigrationPlan([
      {
        id: "aipd_newer",
        status: "validation_failed",
        packet_version: 2,
        raw_packet: { ...v2Packet, request_id: "request-newer" },
        created_at: "2026-07-25T00:00:00.000Z",
      },
      {
        id: "aipd_older",
        status: "validation_failed",
        packet_version: 2,
        raw_packet: { ...v2Packet, request_id: "request-older" },
        created_at: "2026-07-24T00:00:00.000Z",
      },
    ])

    expect(plan.repairs.map((entry) => entry.draft_id)).toEqual([
      "aipd_older",
    ])
    expect(plan.duplicates).toEqual([
      expect.objectContaining({
        draft_id: "aipd_newer",
        canonical_draft_id: "aipd_older",
      }),
    ])
  })

  it("leaves malformed legacy packets in validation_failed with a classified reason", () => {
    const prepared = prepareAiProductDraftMigration({
      id: "aipd_invalid_v1",
      status: "validation_failed",
      packet_version: 1,
      raw_packet: { packet_version: 1, source_agent: "hermes" },
      created_at: "2026-06-01T00:00:00.000Z",
    })

    expect(prepared).toEqual(
      expect.objectContaining({
        kind: "unrecoverable",
        reason: "packet_schema_invalid",
      })
    )
  })
})
