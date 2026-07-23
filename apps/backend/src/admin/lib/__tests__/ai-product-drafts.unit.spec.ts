import {
  buildAiProductDraftDetailUrl,
  buildAiProductDraftListUrl,
  formatAiProductDraftDate,
  getAiProductDraftActionAvailability,
  getAiProductDraftDisplayName,
  getAiProductDraftReviewIssues,
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

  it("builds the Admin detail route used by clickable draft rows", () => {
    expect(buildAiProductDraftDetailUrl("aipd_123")).toBe(
      "/ai-product-drafts/aipd_123"
    )
  })

  it("uses the submitted product name instead of an empty product reference", () => {
    expect(
      getAiProductDraftDisplayName({
        id: "aipd_123",
        product_handle: null,
        product_id: null,
        product_input: {
          product_name: "  Polymaker PolyLite PETG  ",
        },
      })
    ).toBe("Polymaker PolyLite PETG")
  })

  it("falls back through normalized title, handle, product id, and draft id", () => {
    expect(
      getAiProductDraftDisplayName({
        id: "aipd_normalized",
        normalized_draft: {
          target_product: {
            product_title: "Bambu Lab PETG HF",
          },
        },
      })
    ).toBe("Bambu Lab PETG HF")
    expect(
      getAiProductDraftDisplayName({
        id: "aipd_handle",
        product_handle: "example-petg",
      })
    ).toBe("example-petg")
    expect(
      getAiProductDraftDisplayName({
        id: "aipd_product",
        product_id: "prod_123",
      })
    ).toBe("prod_123")
    expect(getAiProductDraftDisplayName({ id: "aipd_only" })).toBe(
      "Draft aipd_only"
    )
  })

  it.each([
    ["received", false, false, true],
    ["validation_failed", false, false, true],
    ["needs_review", true, false, true],
    ["approved", false, true, true],
    ["rejected", false, false, false],
    ["imported", false, false, false],
  ])(
    "keeps %s draft actions aligned with backend lifecycle rules",
    (status, canApprove, canImport, canReject) => {
      expect(getAiProductDraftActionAvailability(status)).toEqual({
        canApprove,
        canImport,
        canReject,
      })
    }
  )

  it("combines warnings and detailed validation errors without duplicates", () => {
    expect(
      getAiProductDraftReviewIssues({
        warnings: ["Target product was not found"],
        validation_errors: [
          {
            path: "product_handle",
            message: "Target product was not found",
          },
          {
            path: "normalized_draft.metadata",
            message: "Metadata is incomplete",
          },
        ],
      })
    ).toEqual([
      "Target product was not found",
      "normalized_draft.metadata: Metadata is incomplete",
    ])
  })
})
