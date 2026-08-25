import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import { AI_PRODUCT_DRAFT_MODULE } from "../../modules/ai-product-draft"
import migrateAiProductDrafts from "../migrate-ai-product-drafts"

const normalizedDraft = {
  schema_version: 1,
  target_product: {
    product_title: "Polymaker PolyTerra Gradient PLA",
  },
  metadata: {},
  content_draft: {
    short_description: "Gradient matte PLA filament.",
    feature_bullets: [],
    seo_title: "Polymaker PolyTerra Gradient PLA",
    seo_description: "Gradient matte PLA filament.",
    ai_search_keywords: ["gradient pla"],
  },
  related_content_suggestions: [],
  product_document_suggestions: [],
  claim_evidence: [],
  warnings: [],
  confidence_summary: {
    overall: 0.9,
    metadata: 0.8,
    content: 0.9,
    documents: 0,
  },
}

function createHarness() {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
  }
  const draft = {
    id: "aipd_polymaker",
    status: "approved",
    packet_version: 1,
    resolved_operation: null,
    normalized_draft: normalizedDraft,
    raw_packet: { packet_version: 1, source_agent: "hermes" },
    created_at: "2026-06-28T00:00:00.000Z",
  }
  const draftModule = {
    listAiProductDrafts: jest.fn().mockResolvedValue([draft]),
    updateAiProductDrafts: jest.fn().mockResolvedValue({
      ...draft,
      status: "needs_review",
      resolved_operation: "create",
    }),
    softDeleteAiProductDrafts: jest.fn(),
    createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "event_1" }),
    listAiProductDraftEvents: jest.fn().mockResolvedValue([]),
  }
  const query = {
    graph: jest.fn().mockResolvedValue({ data: [] }),
  }
  const productModule = {
    listProducts: jest.fn().mockResolvedValue([]),
  }
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === ContainerRegistrationKeys.LOGGER) return logger
      if (key === ContainerRegistrationKeys.QUERY) return query
      if (key === Modules.PRODUCT) return productModule
      if (key === AI_PRODUCT_DRAFT_MODULE) return draftModule
      throw new Error(`Unexpected service ${key}`)
    }),
  }

  return { container, draftModule, logger, query }
}

describe("migrate-ai-product-drafts script", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.AI_PRODUCT_DRAFT_MIGRATION_MODE
    delete process.env.AI_PRODUCT_DRAFT_MIGRATION_CONFIRM
    delete process.env.AI_PRODUCT_DRAFT_MIGRATION_RUN_ID
    delete process.env.AI_PRODUCT_DRAFT_MIGRATION_CLEANUP_CONFIRM
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("defaults to a read-only plan and returns a confirmation hash", async () => {
    const { container, draftModule } = createHarness()

    const report = await migrateAiProductDrafts({ container } as never)

    expect(report).toEqual(
      expect.objectContaining({
        mode: "plan",
        manifest_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        repairs: ["aipd_polymaker"],
      })
    )
    expect(draftModule.updateAiProductDrafts).not.toHaveBeenCalled()
    expect(draftModule.softDeleteAiProductDrafts).not.toHaveBeenCalled()
  })

  it("refuses apply when the live plan hash was not confirmed", async () => {
    process.env.AI_PRODUCT_DRAFT_MIGRATION_MODE = "apply"
    process.env.AI_PRODUCT_DRAFT_MIGRATION_CONFIRM = "stale-hash"
    const { container, draftModule } = createHarness()

    await expect(
      migrateAiProductDrafts({ container } as never)
    ).rejects.toThrow("must match the current plan manifest hash")

    expect(draftModule.updateAiProductDrafts).not.toHaveBeenCalled()
  })

  it("repairs an approved targetless draft back to manual review", async () => {
    const planningHarness = createHarness()
    const plan = await migrateAiProductDrafts({
      container: planningHarness.container,
    } as never)
    process.env.AI_PRODUCT_DRAFT_MIGRATION_MODE = "apply"
    process.env.AI_PRODUCT_DRAFT_MIGRATION_CONFIRM = plan.manifest_hash
    const { container, draftModule } = createHarness()

    const result = await migrateAiProductDrafts({ container } as never)

    expect(result).toEqual(expect.objectContaining({ mode: "apply", repaired: 1 }))
    expect(draftModule.updateAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "aipd_polymaker",
        status: "needs_review",
        resolved_operation: "create",
        validation_errors: [],
        approved_by: null,
        approved_at: null,
      })
    )
    expect(draftModule.createAiProductDraftEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        draft_id: "aipd_polymaker",
        type: "legacy_migrated",
        from_status: "approved",
        to_status: "needs_review",
      })
    )
  })

  it("requires the exact migration run ID before cleanup", async () => {
    process.env.AI_PRODUCT_DRAFT_MIGRATION_MODE = "cleanup"
    process.env.AI_PRODUCT_DRAFT_MIGRATION_RUN_ID = "run-1"
    process.env.AI_PRODUCT_DRAFT_MIGRATION_CLEANUP_CONFIRM = "run-2"
    const { container, draftModule } = createHarness()

    await expect(
      migrateAiProductDrafts({ container } as never)
    ).rejects.toThrow("Cleanup confirmation")

    expect(draftModule.softDeleteAiProductDrafts).not.toHaveBeenCalled()
  })

  it("does not clean a duplicate that was imported after apply", async () => {
    process.env.AI_PRODUCT_DRAFT_MIGRATION_MODE = "cleanup"
    process.env.AI_PRODUCT_DRAFT_MIGRATION_RUN_ID = "run-1"
    process.env.AI_PRODUCT_DRAFT_MIGRATION_CLEANUP_CONFIRM = "run-1"
    const { container, draftModule } = createHarness()
    draftModule.listAiProductDraftEvents.mockResolvedValue([
      {
        draft_id: "aipd_duplicate",
        metadata: {
          migration_run_id: "run-1",
          canonical_draft_id: "aipd_polymaker",
        },
      },
    ])
    draftModule.listAiProductDrafts.mockImplementation(
      async (filters: Record<string, unknown>) => {
        if (filters.id === "aipd_polymaker") {
          return [{ id: "aipd_polymaker", status: "needs_review" }]
        }
        if (filters.id === "aipd_duplicate") {
          return [
            {
              id: "aipd_duplicate",
              status: "imported",
              product_id: "prod_imported",
            },
          ]
        }
        return []
      }
    )

    const result = await migrateAiProductDrafts({ container } as never)

    expect(result).toEqual(
      expect.objectContaining({ mode: "cleanup", cleaned_ids: [] })
    )
    expect(draftModule.softDeleteAiProductDrafts).not.toHaveBeenCalled()
  })
})
