import { render, screen } from "@testing-library/react"

const mockGetCartAction = jest.fn()
const mockGetSessionAction = jest.fn()
const mockRedirect = jest.fn()

jest.mock("@/app/actions/cart", () => ({
  getCartAction: (...args: unknown[]) => mockGetCartAction(...args),
}))

jest.mock("@/app/actions/auth", () => ({
  getSessionAction: (...args: unknown[]) => mockGetSessionAction(...args),
}))

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

jest.mock("@/features/checkout/components/checkout-form", () => ({
  CheckoutForm: () => <div data-testid="checkout-form" />,
}))

jest.mock("@/features/checkout/components/checkout-summary", () => ({
  CheckoutSummary: () => <div data-testid="checkout-summary" />,
}))

jest.mock(
  "@/features/checkout/components/checkout-summary-estimate-context",
  () => ({
    CheckoutSummaryEstimateProvider: ({
      children,
    }: {
      children: React.ReactNode
    }) => <div>{children}</div>,
  }),
)

import CheckoutPage from "../page"

describe("CheckoutPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: { id: "cus_1", email_verified: true },
    })
  })

  it("uses a customer-facing checkout title", async () => {
    mockGetCartAction.mockResolvedValue({
      id: "cart_123",
      items: [{ id: "item_123" }],
    })

    render(await CheckoutPage())

    expect(
      screen.getByRole("heading", { name: "Checkout" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("System_Acquisition")).not.toBeInTheDocument()
  })

  it("does not render the checkout sidebar newsletter signup", async () => {
    mockGetCartAction.mockResolvedValue({
      id: "cart_123",
      items: [{ id: "item_123" }],
    })

    render(await CheckoutPage())

    expect(screen.queryByTestId("newsletter-signup")).not.toBeInTheDocument()
    expect(screen.queryByText("Stay Updated")).not.toBeInTheDocument()
  })

  it("redirects unverified customers to the verification-required page", async () => {
    mockGetCartAction.mockResolvedValue({
      id: "cart_123",
      items: [{ id: "item_123" }],
    })
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: { id: "cus_1", email: "test@example.com", email_verified: false },
    })

    await CheckoutPage()

    expect(mockRedirect).toHaveBeenCalledWith(
      "/verify-required?source=checkout&redirect=%2Fcheckout",
    )
  })
})
