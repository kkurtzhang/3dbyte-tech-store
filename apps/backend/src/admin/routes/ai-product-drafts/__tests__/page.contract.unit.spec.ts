import fs from "node:fs"
import path from "node:path"

const listPageSource = fs.readFileSync(
  path.resolve(__dirname, "../page.tsx"),
  "utf8"
)
const detailPageSource = fs.readFileSync(
  path.resolve(__dirname, "../[id]/page.tsx"),
  "utf8"
)
const actionMenuSource = fs.readFileSync(
  path.resolve(__dirname, "../../../components/action-menu.tsx"),
  "utf8"
)
const hooksSource = fs.readFileSync(
  path.resolve(__dirname, "../../../hooks/ai-product-drafts.tsx"),
  "utf8"
)

describe("AI product draft Admin UI contracts", () => {
  it("puts review issues before state-changing actions", () => {
    expect(detailPageSource).toContain("<DraftReviewIssues")
    expect(detailPageSource.indexOf("<DraftReviewIssues")).toBeLessThan(
      detailPageSource.indexOf('title="Review Actions"')
    )
  })

  it("contains long draft JSON on narrow viewports", () => {
    expect(detailPageSource).toContain('className="min-w-0"')
    expect(detailPageSource).toContain("whitespace-pre-wrap")
    expect(detailPageSource).toContain("break-words")
  })

  it("confirms imports and surfaces mutation failures", () => {
    expect(detailPageSource).toContain("usePrompt")
    expect(detailPageSource).toContain('title: "Import approved draft?"')
    expect(detailPageSource).toContain("toast.error")
  })

  it("keeps the product title and overflow actions keyboard discoverable", () => {
    expect(listPageSource).toContain("<Link")
    expect(listPageSource).toContain("triggerLabel=")
    expect(actionMenuSource).toContain("aria-label={triggerLabel}")
  })

  it("offers confirmed row and bulk cleanup only for terminal failed drafts", () => {
    expect(listPageSource).toContain("useDeleteAiProductDraft")
    expect(listPageSource).toContain("useCleanupAiProductDrafts")
    expect(listPageSource).toContain('label: "Delete draft"')
    expect(listPageSource).toContain("Clean up")
    expect(listPageSource).toContain('status === "validation_failed"')
    expect(listPageSource).toContain("!q.trim()")
    expect(listPageSource).toContain("usePrompt")
    expect(listPageSource).toContain("toast.success")
    expect(listPageSource).toContain("expected_count")
    expect(hooksSource).toContain('method: "delete"')
  })

  it("surfaces identity-resolution work in both the list and detail page", () => {
    expect(listPageSource).toContain('"needs_resolution"')
    expect(listPageSource).toContain('header: "Operation"')
    expect(detailPageSource).toContain("<DraftIdentityResolution")
    expect(detailPageSource).toContain("useResolveAiProductDraft")
    expect(hooksSource).toContain("/resolve")
  })

  it("requires explicit change and destination selection before approval", () => {
    expect(detailPageSource).toContain("<DraftChangeReview")
    expect(detailPageSource).toContain("selectedChangePaths")
    expect(detailPageSource).toContain("selected_change_paths")
    expect(detailPageSource).toContain("import_targets")
    expect(detailPageSource).toContain("snapshot_hash")
  })

  it("explains whether import will create or enrich a product", () => {
    expect(detailPageSource).toContain("resolved_operation")
    expect(detailPageSource).toContain("Create a new unpublished product")
    expect(detailPageSource).toContain("Enrich the existing product")
  })

  it("defaults to the oldest needs-review queue and renders one inline sort control", () => {
    expect(listPageSource).toContain('status: "needs_review"')
    expect(listPageSource).toContain('id: "created_at"')
    expect(listPageSource.match(/<DataTable\.SortingMenu/g) || []).toHaveLength(
      1
    )
    expect(listPageSource).not.toContain("<DataTable.Toolbar")
    expect(listPageSource).toContain("statusCounts")
  })

  it("groups queue and table controls with consistent section spacing", () => {
    expect(listPageSource).toContain(
      'className="flex flex-col gap-4 px-6 py-4"'
    )
    expect(listPageSource).not.toContain(
      'className="grid gap-3 px-6 pt-4 sm:grid-cols-2 lg:grid-cols-4"'
    )
  })

  it("has explicit list errors, queue empty states, and URL-persisted controls", () => {
    expect(listPageSource).toContain("useSearchParams")
    expect(listPageSource).toContain("refetch")
    expect(listPageSource).toContain('role="alert"')
    expect(listPageSource).toContain("No drafts need review")
  })

  it("surfaces backend mutation errors, progress, and event metadata", () => {
    expect(detailPageSource).toContain("getAiProductDraftErrorMessage")
    expect(detailPageSource).toContain("import_progress")
    expect(detailPageSource).toContain("event.metadata")
    expect(detailPageSource).toContain('role="alert"')
  })
})
