import {
  buildSupportTicketListUrl,
  formatSupportTicketDate,
  getSupportTicketStatusBadgeColor,
} from "../support-tickets"

describe("admin support ticket helpers", () => {
  it("formats empty and real dates for the admin timeline", () => {
    expect(formatSupportTicketDate(null)).toBe("-")
    expect(formatSupportTicketDate("2026-05-20T00:00:00.000Z")).toContain("2026")
  })

  it("maps ticket statuses to stable badge colors", () => {
    expect(getSupportTicketStatusBadgeColor("new")).toBe("orange")
    expect(getSupportTicketStatusBadgeColor("resolved")).toBe("green")
    expect(getSupportTicketStatusBadgeColor("spam")).toBe("red")
  })

  it("builds filtered admin ticket list urls", () => {
    expect(
      buildSupportTicketListUrl({
        q: "3DBS",
        source: "ai_chat",
        status: "new",
      })
    ).toBe("/admin/support-tickets?q=3DBS&source=ai_chat&status=new")
  })
})
