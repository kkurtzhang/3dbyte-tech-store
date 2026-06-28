import {
  assertAiProductDraftCanImport,
  buildAiProductDraftEvent,
  getAiProductDraftNextStatus,
} from "../lifecycle"

describe("AI product draft lifecycle", () => {
  it("moves valid intake results to needs_review and invalid results to validation_failed", () => {
    expect(getAiProductDraftNextStatus("received", "validated")).toBe(
      "needs_review"
    )
    expect(getAiProductDraftNextStatus("received", "validation_failed")).toBe(
      "validation_failed"
    )
  })

  it("only allows approved drafts to be imported", () => {
    expect(() =>
      assertAiProductDraftCanImport({ id: "aipd_1", status: "needs_review" })
    ).toThrow("Only approved AI product drafts can be imported")

    expect(() =>
      assertAiProductDraftCanImport({ id: "aipd_1", status: "approved" })
    ).not.toThrow()
  })

  it("builds auditable event payloads for status transitions", () => {
    expect(
      buildAiProductDraftEvent({
        draft_id: "aipd_1",
        type: "approved",
        actor_type: "admin",
        actor_id: "user_1",
        from_status: "needs_review",
        to_status: "approved",
        metadata: { notes: "Looks good" },
      })
    ).toEqual({
      draft_id: "aipd_1",
      type: "approved",
      actor_type: "admin",
      actor_id: "user_1",
      from_status: "needs_review",
      to_status: "approved",
      metadata: { notes: "Looks good" },
    })
  })
})
