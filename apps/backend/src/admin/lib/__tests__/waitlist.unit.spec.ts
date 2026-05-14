import {
  buildWaitlistExportUrl,
  formatWaitlistDate,
  getWaitlistStatusBadgeColor,
} from "../waitlist"

describe("admin waitlist UI helpers", () => {
  it("formats waitlist dates for table cells", () => {
    expect(formatWaitlistDate("2026-05-13T00:00:00.000Z")).toBe("May 13, 2026")
    expect(formatWaitlistDate(null)).toBe("-")
  })

  it("selects badge colors for queued and notified rows", () => {
    expect(getWaitlistStatusBadgeColor(false)).toBe("orange")
    expect(getWaitlistStatusBadgeColor(true)).toBe("green")
  })

  it("builds an export URL that preserves current filters", () => {
    expect(
      buildWaitlistExportUrl({
        q: "pla fan",
        status: "queued",
        product_id: "prod_1",
      })
    ).toBe("/admin/waitlist/export.csv?q=pla+fan&status=queued&product_id=prod_1")
  })
})
