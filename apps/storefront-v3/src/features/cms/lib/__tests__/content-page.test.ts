import { stripLeadingMarkdownHeading } from "../content-page"

describe("stripLeadingMarkdownHeading", () => {
  it("removes a matching leading h1 heading", () => {
    const content = "# Privacy Policy\n\nBody copy"

    expect(stripLeadingMarkdownHeading(content, ["Privacy Policy"])).toBe(
      "Body copy"
    )
  })

  it("removes a matching leading h2 heading from markdown", () => {
    const content = "## Terms & Conditions\n\nDetails"

    expect(
      stripLeadingMarkdownHeading(content, [
        "Terms and Conditions",
        "Terms & Conditions",
      ])
    ).toBe("Details")
  })

  it("leaves content untouched when the heading does not match", () => {
    const content = "# Shipping Policy\n\nDelivery notes"

    expect(stripLeadingMarkdownHeading(content, ["Returns & Refunds"])).toBe(
      "# Shipping Policy\n\nDelivery notes"
    )
  })
})
