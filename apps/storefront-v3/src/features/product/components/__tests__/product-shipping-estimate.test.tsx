import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProductShippingEstimate } from "../product-shipping-estimate"

jest.mock("lucide-react", () => ({
  Clock3: () => <span data-testid="clock-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  MapPin: () => <span data-testid="pin-icon" />,
  Truck: () => <span data-testid="truck-icon" />,
  Zap: () => <span data-testid="zap-icon" />,
}))

jest.mock("@/app/actions/product-shipping", () => ({
  estimateProductShippingAction: jest.fn(),
}))

import { estimateProductShippingAction } from "@/app/actions/product-shipping"

const mockEstimateProductShippingAction =
  estimateProductShippingAction as jest.MockedFunction<
    typeof estimateProductShippingAction
  >

describe("ProductShippingEstimate", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
  })

  it("shows a variant selection hint when no variant is available", () => {
    render(<ProductShippingEstimate variantId={undefined} />)

    expect(
      screen.getByText(/select your options to unlock a live postcode estimate/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /check postage/i })
    ).toBeDisabled()
  })

  it("validates the postcode before requesting an estimate", async () => {
    const user = userEvent.setup()

    render(<ProductShippingEstimate variantId="variant_123" />)

    await user.type(screen.getByLabelText(/postcode/i), "700")
    await user.click(screen.getByRole("button", { name: /check postage/i }))

    expect(
      screen.getByText(/enter a valid 4-digit australian postcode/i)
    ).toBeInTheDocument()
    expect(mockEstimateProductShippingAction).not.toHaveBeenCalled()
  })

  it("renders live shipping options returned by the server action", async () => {
    const user = userEvent.setup()

    mockEstimateProductShippingAction.mockResolvedValue({
      success: true,
      postcode: "7000",
      options: [
        {
          id: "standard",
          name: "Standard Shipping",
          description: "2-5 business days",
          amount: 9.95,
          currencyCode: "aud",
          priceType: "flat",
        },
        {
          id: "express",
          name: "Express Shipping",
          description: "1-2 business days",
          amount: 19.95,
          currencyCode: "aud",
          priceType: "calculated",
        },
      ],
    })

    render(<ProductShippingEstimate variantId="variant_123" />)

    await user.type(screen.getByLabelText(/postcode/i), "7000")
    await user.click(screen.getByRole("button", { name: /check postage/i }))

    await waitFor(() => {
      expect(screen.getByText(/shipping to 7000/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/from a\$9\.95/i)).toBeInTheDocument()
    expect(screen.getByText("Standard Shipping")).toBeInTheDocument()
    expect(screen.getByText("Express Shipping")).toBeInTheDocument()
    expect(screen.getByText(/calculated live/i)).toBeInTheDocument()
  })

  it("shows an error message when the estimate request fails", async () => {
    const user = userEvent.setup()

    mockEstimateProductShippingAction.mockResolvedValue({
      success: false,
      error: "No shipping methods are currently available for this postcode.",
    })

    render(<ProductShippingEstimate variantId="variant_123" />)

    await user.type(screen.getByLabelText(/postcode/i), "7000")
    await user.click(screen.getByRole("button", { name: /check postage/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/no shipping methods are currently available for this postcode/i)
      ).toBeInTheDocument()
    })
  })
})
