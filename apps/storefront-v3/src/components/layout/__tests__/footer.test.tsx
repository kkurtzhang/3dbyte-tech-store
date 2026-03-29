import { render, screen } from "@testing-library/react"

import { Footer } from "../footer"

jest.mock("@/components/ui/payment-method-support", () => ({
  PaymentMethodSupport: () => <div data-testid="payment-method-support" />,
}))

jest.mock("../newsletter-signup", () => ({
  NewsletterSignup: () => <div data-testid="newsletter-signup" />,
}))

describe("Footer", () => {
  it("renders support links including shipping", () => {
    render(<Footer />)

    expect(
      screen.getByRole("link", {
        name: /shipping/i,
      })
    ).toHaveAttribute("href", "/shipping")

    expect(
      screen.getByRole("link", {
        name: /returns/i,
      })
    ).toHaveAttribute("href", "/returns")
  })
})
