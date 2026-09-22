const qualityLabel = (draft: unknown) => require("../ai-product-drafts").getAiProductDraftQualityLabel(draft)
describe("AI draft quality presentation", () => {
  it("never tells an unreviewed or legacy approval that it is ready to import", () => {
    const nextStep = require("../ai-product-drafts").getAiProductDraftNextStep
    expect(nextStep({ status: "approved", review_current: false })).toContain("blocked")
    expect(nextStep({ status: "needs_review", quality: { can_approve: false } })).toContain("fresh")
    expect(nextStep({ status: "approved", review_current: true })).toContain("ready to import")
  })
  it("never presents a legacy model score as verified quality", () => {
    expect(qualityLabel({ packet_version: 2, confidence_summary: { overall: 0.99 } })).toBe("Research required")
  })
  it("shows gate readiness rather than an accuracy percentage", () => {
    expect(qualityLabel({ quality: { can_approve: true } })).toBe("Ready for review")
    expect(qualityLabel({ quality: { can_approve: false } })).toBe("Research required")
  })
})
