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
})
