import { importAiProductDraft } from "../importer"

const normalizedDraft = {
  schema_version: 1,
  target_product: {
    product_id: "prod_123",
    product_handle: "example-petg",
  },
  metadata: {
    ai_core: {
      schema_version: 1,
      product_kind: "filament",
      ai_search_keywords: ["petg"],
    },
    three_d_printing: {
      schema_version: 1,
      product_kind: "filament",
      material: "PETG",
    },
  },
  content_draft: {
    short_description: "<script>alert(1)</script>Source backed PETG.",
    feature_bullets: ["<b>Functional</b> parts"],
    seo_title: "Example PETG",
    seo_description: "Source backed PETG.",
    ai_search_keywords: ["petg"],
  },
  related_content_suggestions: [],
  product_document_suggestions: [
    {
      title: "Example PETG TDS",
      document_type: "datasheet",
      source_url: "https://manufacturer.example/tds.pdf",
      source_kind: "official_datasheet",
      source_label: "Official TDS",
      source_checked_at: "2026-06-28T00:00:00.000Z",
      search_keywords: ["petg"],
      confidence: 0.9,
    },
  ],
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
    metadata: 0.9,
    content: 0.8,
    documents: 0.9,
  },
}

describe("importAiProductDraft", () => {
  it("updates product metadata and writes sanitized Strapi drafts only", async () => {
    const productModule = {
      listProducts: jest.fn().mockResolvedValue([
        {
          id: "prod_123",
          title: "Example PETG",
          handle: "example-petg",
          metadata: {
            legacy_flag: true,
            three_d_printing: { schema_version: 1, material: "PLA" },
          },
        },
      ]),
      updateProducts: jest.fn().mockResolvedValue({ id: "prod_123" }),
    }
    const strapiModule = {
      upsertAiProductDescriptionDraft: jest.fn().mockResolvedValue({ id: 1 }),
      upsertAiProductDocumentDrafts: jest.fn().mockResolvedValue([{ id: 2 }]),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === "product") return productModule
        if (key === "strapi") return strapiModule
        throw new Error(`Unexpected module ${key}`)
      }),
    }

    const summary = await importAiProductDraft({
      container: container as never,
      draft: {
        id: "aipd_1",
        status: "approved",
        product_id: "prod_123",
        product_handle: "example-petg",
        normalized_draft: normalizedDraft,
      },
    })

    expect(productModule.updateProducts).toHaveBeenCalledWith("prod_123", {
      metadata: {
        legacy_flag: true,
        ai_core: normalizedDraft.metadata.ai_core,
        three_d_printing: normalizedDraft.metadata.three_d_printing,
      },
    })
    expect(strapiModule.upsertAiProductDescriptionDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        medusa_product_id: "prod_123",
        rich_description: expect.not.stringContaining("<script>"),
        features: ["Functional parts"],
      })
    )
    expect(strapiModule.upsertAiProductDocumentDrafts).toHaveBeenCalledWith(
      "prod_123",
      expect.arrayContaining([
        expect.objectContaining({
          source_url: "https://manufacturer.example/tds.pdf",
        }),
      ])
    )
    expect(summary.imported_targets).toEqual([
      "medusa_metadata",
      "strapi_description_draft",
      "product_document_drafts",
    ])
  })
})
