import {
  buildAiProductDraftListUrl,
  formatAiProductDraftDate,
  getAiProductDraftStatusBadgeColor,
  labelizeAiProductDraftValue,
} from "../ai-product-drafts"

describe("AI product draft admin helpers", () => {
  it("formats statuses, badge colors, dates, and list URLs", () => {
    expect(labelizeAiProductDraftValue("needs_review")).toBe("Needs Review")
    expect(getAiProductDraftStatusBadgeColor("needs_review")).toBe("orange")
    expect(getAiProductDraftStatusBadgeColor("approved")).toBe("blue")
    expect(getAiProductDraftStatusBadgeColor("imported")).toBe("green")
    expect(formatAiProductDraftDate("2026-06-28T00:00:00.000Z")).toContain(
      "2026"
    )
    expect(
      buildAiProductDraftListUrl({
        q: "petg",
        status: "needs_review",
        source_agent: "all",
      })
    ).toBe("/admin/ai-product-drafts?q=petg&status=needs_review")
  })
})
