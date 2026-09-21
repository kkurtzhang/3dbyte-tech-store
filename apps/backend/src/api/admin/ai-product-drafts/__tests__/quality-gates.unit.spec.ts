import { POST as approve } from "../[id]/approve/route"
import { GET as detail } from "../[id]/route"
import { normalizeProductResearchPacket } from "../../../../lib/ai-product-drafts/normalizer"
import { ProductResearchPacketSchema } from "../../../../lib/ai-product-drafts/schemas"
import { draftReviewHash } from "../../../../lib/ai-product-drafts/quality"
import { packetV3 } from "../../../../lib/ai-product-drafts/__tests__/quality-fixture"

function harness(draft: Record<string, unknown>, body = {}) {
  const module = {
    listAiProductDrafts: jest.fn().mockResolvedValue([draft]),
    listAiProductDraftEvents: jest.fn().mockResolvedValue([]),
    updateAiProductDrafts: jest.fn().mockImplementation(async input => ({ ...draft, ...input })),
    createAiProductDraftEvents: jest.fn(),
  }
  const req = { params: { id: "aipd_quality" }, body, auth_context: { actor_id: "reviewer" }, scope: { resolve: () => module } }
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  return { req, res, module }
}
const valid = () => ({ id: "aipd_quality", status: "needs_review", resolved_operation: "create", raw_packet: packetV3,
  normalized_draft: normalizeProductResearchPacket(ProductResearchPacketSchema.parse(packetV3)) })

describe("draft quality API gates", () => {
  it("blocks legacy drafts before any approval write", async () => {
    const h = harness({ ...valid(), raw_packet: { packet_version: 2 } })
    await approve(h.req as never, h.res as never)
    expect(h.res.status).toHaveBeenCalledWith(409)
    expect(h.module.updateAiProductDrafts).not.toHaveBeenCalled()
  })
  it("requires an explicit current evidence review", async () => {
    for (const body of [{}, { review_acknowledged: true, review_hash: "stale" }]) {
      const h = harness(valid(), body)
      await approve(h.req as never, h.res as never)
      expect(h.res.status).toHaveBeenCalledWith(409)
      expect(h.module.updateAiProductDrafts).not.toHaveBeenCalled()
    }
  })
  it("records the exact reviewed research at approval", async () => {
    const draft = valid()
    const h = harness(draft, { review_acknowledged: true, review_hash: draftReviewHash(draft) })
    await approve(h.req as never, h.res as never)
    expect(h.res.status).toHaveBeenCalledWith(200)
    expect(h.module.updateAiProductDrafts).toHaveBeenCalledWith(expect.objectContaining({
      approved_import_targets: expect.objectContaining({ review_hash: draftReviewHash(draft), review_acknowledged: true }),
    }))
  })
  it("exposes quality and a stable review hash without mutating stored drafts", async () => {
    const draft = valid()
    const h = harness(draft)
    await detail(h.req as never, h.res as never)
    expect(h.res.json).toHaveBeenCalledWith(expect.objectContaining({ draft: expect.objectContaining({
      quality: expect.objectContaining({ can_approve: true }), review_hash: draftReviewHash(draft),
    }) }))
    expect(h.module.updateAiProductDrafts).not.toHaveBeenCalled()
  })
})
