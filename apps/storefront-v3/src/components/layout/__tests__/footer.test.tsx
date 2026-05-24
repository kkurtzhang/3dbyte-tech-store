import { render, screen } from "@testing-library/react"

import { Footer } from "../footer"

jest.mock("../newsletter-signup", () => ({
  NewsletterSignup: () => <div>Newsletter signup</div>,
}))

jest.mock("@/components/ui/payment-method-support", () => ({
  PaymentMethodSupport: () => <div>Payment method support</div>,
}))

describe("Footer", () => {
  it("surfaces customer resource and download destinations", () => {
    render(<Footer />)

    expect(screen.getByRole("link", { name: /download center/i })).toHaveAttribute(
      "href",
      "/downloads"
    )
    expect(screen.getByRole("link", { name: /resource center/i })).toHaveAttribute(
      "href",
      "/docs"
    )
    expect(screen.queryByRole("link", { name: /documentation/i })).not.toBeInTheDocument()
  })
})
