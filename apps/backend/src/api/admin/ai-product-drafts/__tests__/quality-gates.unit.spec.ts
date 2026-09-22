import { POST as approve } from "../[id]/approve/route"
import { GET as detail } from "../[id]/route"
import { normalizeProductResearchPacket } from "../../../../lib/ai-product-drafts/normalizer"
import { ProductResearchPacketSchema } from "../../../../lib/ai-product-drafts/schemas"
import { draftReviewHash } from "../../../../lib/ai-product-drafts/quality"
import { packetV3 } from "../../../../lib/ai-product-drafts/__tests__/quality-fixture"
import { importAiProductDraft } from "../../../../lib/ai-product-drafts/importer"
import { POST as replaceResearch } from "../[id]/reprocess/route"
import { POST as intake } from "../../../integrations/hermes/product-drafts/route"

function harness(draft: Record<string, unknown>, body = {}) {
  const module = {
    listAiProductDrafts: jest.fn().mockResolvedValue([draft]),
    listAiProductDraftEvents: jest.fn().mockResolvedValue([]),
    updateAiProductDrafts: jest
      .fn()
      .mockImplementation(async (input) => ({ ...draft, ...input })),
    createAiProductDraftEvents: jest.fn(),
    createAiProductDrafts: jest
      .fn()
      .mockImplementation(async (input) => ({ id: "new", ...input })),
  }
  const req = {
    params: { id: "aipd_quality" },
    body,
    auth_context: { actor_id: "reviewer" },
    scope: {
      resolve: (key: string) => {
        if (key === "locking")
          return {
            execute: async (_key: string, job: () => Promise<unknown>) => job(),
          }
        if (key === "query") return { graph: async () => ({ data: [] }) }
        if (key === "notification") return { createNotifications: jest.fn() }
        if (key === "logger") return { warn: jest.fn() }
        return module
      },
    },
  }
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  return { req, res, module }
}
const valid = () => ({
  id: "aipd_quality",
  status: "needs_review",
  resolved_operation: "create",
  raw_packet: packetV3,
  normalized_draft: normalizeProductResearchPacket(
    ProductResearchPacketSchema.parse(packetV3)
  ),
})

describe("draft quality API gates", () => {
  it("backs up the old draft before accepting replacement research", async () => {
    const draft = { ...valid(), product_input: packetV3.product_input }
    const h = harness(draft, {
      packet: packetV3,
      review_hash: draftReviewHash(draft),
    })
    await replaceResearch(h.req as never, h.res as never)
    expect(h.module.createAiProductDraftEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "research_replacement_backup",
        metadata: expect.objectContaining({ previous_draft: draft }),
      })
    )
    expect(
      h.module.createAiProductDraftEvents.mock.invocationCallOrder[0]
    ).toBeLessThan(h.module.updateAiProductDrafts.mock.invocationCallOrder[0])
    expect(h.res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          status: "needs_review",
          approved_import_targets: null,
          quality: expect.objectContaining({ can_approve: true }),
        }),
      })
    )
  })
  it("accepts targetless v3 intake with a resolved create operation", async () => {
    const token = process.env.HERMES_PRODUCT_DRAFT_TOKEN
    process.env.HERMES_PRODUCT_DRAFT_TOKEN = "test-only"
    try {
      const h = harness({}, packetV3)
      h.module.listAiProductDrafts.mockResolvedValue([])
      await intake(
        {
          ...h.req,
          headers: { "x-3db-hermes-product-draft-token": "test-only" },
        } as never,
        h.res as never
      )
      expect(h.res.status).toHaveBeenCalledWith(201)
      expect(h.module.createAiProductDrafts).toHaveBeenCalledWith(
        expect.objectContaining({
          packet_version: 3,
          request_id: packetV3.request_id,
          resolved_operation: "create",
          status: "needs_review",
        })
      )
    } finally {
      if (token === undefined) delete process.env.HERMES_PRODUCT_DRAFT_TOKEN
      else process.env.HERMES_PRODUCT_DRAFT_TOKEN = token
    }
  })
  it("refuses direct imports of legacy or unreviewed research before resolving services", async () => {
    for (const draft of [
      valid(),
      { ...valid(), raw_packet: { packet_version: 2 } },
    ]) {
      const container = {
        resolve: jest.fn(() => {
          throw new Error("Services must not be reached")
        }),
      }
      await expect(
        importAiProductDraft({
          container,
          draft: { ...draft, status: "approved" } as never,
        })
      ).rejects.toThrow(/Research|research/)
      expect(container.resolve).not.toHaveBeenCalled()
    }
  })
  it("blocks legacy drafts before any approval write", async () => {
    const h = harness({ ...valid(), raw_packet: { packet_version: 2 } })
    await approve(h.req as never, h.res as never)
    expect(h.res.status).toHaveBeenCalledWith(409)
    expect(h.module.updateAiProductDrafts).not.toHaveBeenCalled()
  })
  it("requires an explicit current evidence review", async () => {
    for (const body of [
      {},
      { review_acknowledged: true, review_hash: "stale" },
    ]) {
      const h = harness(valid(), body)
      await approve(h.req as never, h.res as never)
      expect(h.res.status).toHaveBeenCalledWith(409)
      expect(h.module.updateAiProductDrafts).not.toHaveBeenCalled()
    }
  })
  it("records the exact reviewed research at approval", async () => {
    const draft = valid()
    const h = harness(draft, {
      review_acknowledged: true,
      review_hash: draftReviewHash(draft),
    })
    await approve(h.req as never, h.res as never)
    expect(h.res.status).toHaveBeenCalledWith(200)
    expect(h.module.updateAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        approved_import_targets: expect.objectContaining({
          review_hash: draftReviewHash(draft),
          review_acknowledged: true,
        }),
      })
    )
  })
  it("exposes quality and a stable review hash without mutating stored drafts", async () => {
    const draft = valid()
    const h = harness(draft)
    await detail(h.req as never, h.res as never)
    expect(h.res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          quality: expect.objectContaining({ can_approve: true }),
          review_hash: draftReviewHash(draft),
        }),
      })
    )
    expect(h.module.updateAiProductDrafts).not.toHaveBeenCalled()
  })
})
