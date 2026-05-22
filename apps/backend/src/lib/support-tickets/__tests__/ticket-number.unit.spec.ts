import { generateSupportTicketNumber } from "../ticket-number"

describe("generateSupportTicketNumber", () => {
  it("generates readable support ticket numbers", () => {
    expect(generateSupportTicketNumber()).toMatch(
      /^3DBS-[A-Z2-9]{4}-[A-Z2-9]{6}$/
    )
  })
})
