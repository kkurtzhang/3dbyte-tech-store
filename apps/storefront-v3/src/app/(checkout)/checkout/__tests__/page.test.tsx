import { render, screen } from "@testing-library/react"

const mockGetCartAction = jest.fn()
const mockRedirect = jest.fn()

jest.mock("@/app/actions/cart", () => ({
  getCartAction: (...args: unknown[]) => mockGetCartAction(...args)
}))

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args)
}))

jest.mock("@/features/checkout/components/checkout-form", () => ({
  CheckoutForm: () => <div data-testid="checkout-form" />
}))

jest.mock("@/features/checkout/components/checkout-summary", () => ({
  CheckoutSummary: () => <div data-testid="checkout-summary" />
}))

jest.mock("@/components/layout/newsletter-signup", () => ({
  NewsletterSignup: () => <div data-testid="newsletter-signup" />
}))

import CheckoutPage from "../page"

describe("CheckoutPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("uses a customer-facing checkout title", async () => {
    mockGetCartAction.mockResolvedValue({
      id: "cart_123",
      items: [{ id: "item_123" }]
    })

    render(await CheckoutPage())

    expect(
      screen.getByRole("heading", { name: "Checkout" })
    ).toBeInTheDocument()
    expect(screen.queryByText("System_Acquisition")).not.toBeInTheDocument()
  })
})
