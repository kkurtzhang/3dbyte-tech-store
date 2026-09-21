const qualityLabel = (draft: unknown) => require("../ai-product-drafts").getAiProductDraftQualityLabel(draft)
describe("AI draft quality presentation", () => {
  it("never presents a legacy model score as verified quality", () => {
    expect(qualityLabel({ packet_version: 2, confidence_summary: { overall: 0.99 } })).toBe("Research required")
  })
  it("shows gate readiness rather than an accuracy percentage", () => {
    expect(qualityLabel({ quality: { can_approve: true } })).toBe("Ready for review")
    expect(qualityLabel({ quality: { can_approve: false } })).toBe("Research required")
  })
})
