const mockCreateProductsRun = jest.fn()
const mockUpdateProductsRun = jest.fn()

jest.mock("@medusajs/medusa/core-flows", () => ({
  createProductsWorkflow: jest.fn(() => ({
    run: mockCreateProductsRun,
  })),
  updateProductsWorkflow: jest.fn(() => ({
    run: mockUpdateProductsRun,
  })),
}))

import { buildAiProductSnapshotHash } from "../resolution"
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
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateProductsRun.mockResolvedValue({ result: [] })
    mockUpdateProductsRun.mockResolvedValue({ result: [] })
  })

  it("does not guess enrich when an approved legacy draft has no operation", async () => {
    const container = {
      resolve: jest.fn(),
    }

    await expect(
      importAiProductDraft({
        container: container as never,
        draft: {
          id: "aipd_legacy",
          status: "approved",
          product_id: null,
          product_handle: null,
          normalized_draft: normalizedDraft,
        },
      })
    ).rejects.toThrow("resolved operation")

    expect(container.resolve).not.toHaveBeenCalled()
  })

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
        resolved_operation: "enrich",
        product_id: "prod_123",
        product_handle: "example-petg",
        normalized_draft: normalizedDraft,
        approved_snapshot_hash: buildAiProductSnapshotHash({
          id: "prod_123",
          title: "Example PETG",
          handle: "example-petg",
          metadata: {
            legacy_flag: true,
            three_d_printing: { schema_version: 1, material: "PLA" },
          },
        }),
      },
    })

    expect(mockUpdateProductsRun).toHaveBeenCalledWith({
      input: {
        products: [
          {
            id: "prod_123",
            metadata: {
              legacy_flag: true,
              ai_core: normalizedDraft.metadata.ai_core,
              three_d_printing: normalizedDraft.metadata.three_d_printing,
            },
          },
        ],
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

  it("creates a safe unpublished product shell without commercial guesses", async () => {
    mockCreateProductsRun.mockResolvedValue({
      result: [
        {
          id: "prod_new",
          title: "Example PETG",
          handle: "example-petg-new",
          metadata: {
            three_d_printing: {
              material: "PETG",
            },
          },
        },
      ],
    })
    const fulfillmentModule = {
      listShippingProfiles: jest
        .fn()
        .mockResolvedValue([{ id: "sp_default", type: "default" }]),
    }
    const salesChannelModule = {
      listSalesChannels: jest
        .fn()
        .mockResolvedValue([{ id: "sc_web", name: "Web Store" }]),
    }
    const strapiModule = {
      upsertAiProductDescriptionDraft: jest.fn(),
      upsertAiProductDocumentDrafts: jest.fn(),
    }
    const productModule = {
      listProducts: jest.fn(),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === "product") return productModule
        if (key === "fulfillment") return fulfillmentModule
        if (key === "sales_channel") return salesChannelModule
        if (key === "strapi") return strapiModule
        throw new Error(`Unexpected module ${key}`)
      }),
    }
    const onProgress = jest.fn()

    const summary = await importAiProductDraft({
      container: container as never,
      draft: {
        id: "aipd_create",
        status: "approved",
        resolved_operation: "create",
        product_input: {
          product_name: "Example PETG",
          supplier_sku: "SUP-123",
        },
        normalized_draft: {
          ...normalizedDraft,
          target_product: {
            product_title: "Example PETG",
          },
        },
        approved_changes: [
          {
            path: "metadata.three_d_printing.material",
            proposed_value: "PETG",
          },
        ],
        approved_import_targets: {
          medusa_metadata: true,
          strapi_description_draft: false,
          product_document_drafts: false,
        },
      },
      onProgress,
    })

    const createInput =
      mockCreateProductsRun.mock.calls[0][0].input.products[0]
    expect(createInput).toEqual(
      expect.objectContaining({
        title: "Example PETG",
        status: "draft",
        shipping_profile_id: "sp_default",
        sales_channels: [{ id: "sc_web" }],
        options: [{ title: "Default", values: ["Default"] }],
        variants: [
          {
            title: "Default",
            options: { Default: "Default" },
            manage_inventory: false,
          },
        ],
        metadata: {
          three_d_printing: {
            material: "PETG",
          },
        },
      })
    )
    expect(createInput.variants[0]).not.toHaveProperty("sku")
    expect(createInput.variants[0]).not.toHaveProperty("prices")
    expect(createInput).not.toHaveProperty("price")
    expect(createInput).not.toHaveProperty("inventory_quantity")
    expect(strapiModule.upsertAiProductDescriptionDraft).not.toHaveBeenCalled()
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        medusa_product: expect.objectContaining({
          status: "completed",
          product_id: "prod_new",
        }),
      })
    )
    expect(summary).toEqual(
      expect.objectContaining({
        operation: "create",
        product_id: "prod_new",
        product_handle: "example-petg-new",
      })
    )
  })

  it("enriches only the admin-approved metadata paths", async () => {
    const product = {
      id: "prod_123",
      title: "Example PETG",
      handle: "example-petg",
      metadata: {
        legacy_flag: true,
        three_d_printing: {
          schema_version: 1,
          material: "PLA",
        },
      },
    }
    const productModule = {
      listProducts: jest.fn().mockResolvedValue([product]),
    }
    const strapiModule = {
      upsertAiProductDescriptionDraft: jest.fn(),
      upsertAiProductDocumentDrafts: jest.fn(),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === "product") return productModule
        if (key === "strapi") return strapiModule
        throw new Error(`Unexpected module ${key}`)
      }),
    }
    const snapshotHash = buildAiProductSnapshotHash(product)

    await importAiProductDraft({
      container: container as never,
      draft: {
        id: "aipd_enrich",
        status: "approved",
        resolved_operation: "enrich",
        product_id: "prod_123",
        product_handle: "example-petg",
        normalized_draft: normalizedDraft,
        approved_snapshot_hash: snapshotHash,
        approved_changes: [
          {
            path: "metadata.three_d_printing.diameter_mm",
            proposed_value: 1.75,
          },
        ],
        approved_import_targets: {
          medusa_metadata: true,
          strapi_description_draft: false,
          product_document_drafts: false,
        },
      },
    })

    expect(mockUpdateProductsRun).toHaveBeenCalledWith({
      input: {
        products: [
          {
            id: "prod_123",
            metadata: {
              legacy_flag: true,
              three_d_printing: {
                schema_version: 1,
                material: "PLA",
                diameter_mm: 1.75,
              },
            },
          },
        ],
      },
    })
    expect(strapiModule.upsertAiProductDescriptionDraft).not.toHaveBeenCalled()
    expect(strapiModule.upsertAiProductDocumentDrafts).not.toHaveBeenCalled()
  })

  it("stops enrichment when the approved product snapshot is stale", async () => {
    const productModule = {
      listProducts: jest.fn().mockResolvedValue([
        {
          id: "prod_123",
          title: "Example PETG",
          handle: "example-petg",
          metadata: {
            three_d_printing: {
              material: "ABS",
            },
          },
        },
      ]),
    }
    const strapiModule = {
      upsertAiProductDescriptionDraft: jest.fn(),
      upsertAiProductDocumentDrafts: jest.fn(),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === "product") return productModule
        if (key === "strapi") return strapiModule
        throw new Error(`Unexpected module ${key}`)
      }),
    }

    await expect(
      importAiProductDraft({
        container: container as never,
        draft: {
          id: "aipd_enrich",
          status: "approved",
          resolved_operation: "enrich",
          product_id: "prod_123",
          product_handle: "example-petg",
          normalized_draft: normalizedDraft,
          approved_snapshot_hash: "stale_snapshot_hash",
          approved_changes: [],
          approved_import_targets: {
            medusa_metadata: true,
            strapi_description_draft: false,
            product_document_drafts: false,
          },
        },
      })
    ).rejects.toThrow("changed after approval")

    expect(mockUpdateProductsRun).not.toHaveBeenCalled()
  })

  it("resumes a partially completed create import without creating twice", async () => {
    const productModule = {
      listProducts: jest.fn().mockResolvedValue([
        {
          id: "prod_new",
          title: "Example PETG",
          handle: "example-petg-new",
          metadata: {},
        },
      ]),
    }
    const strapiModule = {
      upsertAiProductDescriptionDraft: jest.fn().mockResolvedValue({ id: 1 }),
      upsertAiProductDocumentDrafts: jest.fn(),
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
        id: "aipd_create",
        status: "approved",
        resolved_operation: "create",
        product_id: "prod_new",
        product_handle: "example-petg-new",
        normalized_draft: {
          ...normalizedDraft,
          target_product: {
            product_title: "Example PETG",
          },
        },
        approved_changes: [],
        approved_import_targets: {
          medusa_metadata: true,
          strapi_description_draft: true,
          product_document_drafts: false,
        },
        import_progress: {
          medusa_product: {
            status: "completed",
            product_id: "prod_new",
            product_handle: "example-petg-new",
          },
          medusa_metadata: {
            status: "completed",
          },
        },
      },
    })

    expect(mockCreateProductsRun).not.toHaveBeenCalled()
    expect(mockUpdateProductsRun).not.toHaveBeenCalled()
    expect(strapiModule.upsertAiProductDescriptionDraft).toHaveBeenCalledTimes(1)
    expect(summary.product_id).toBe("prod_new")
  })
})
