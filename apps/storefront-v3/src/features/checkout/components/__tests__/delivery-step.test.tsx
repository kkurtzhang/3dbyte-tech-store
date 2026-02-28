import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DeliveryStep } from "../delivery-step"

// Mock lucide-react
jest.mock("lucide-react", () => ({
  Truck: () => <span data-testid="truck-icon">🚚</span>,
  Zap: () => <span data-testid="zap-icon">⚡</span>,
  Package: () => <span data-testid="package-icon">📦</span>,
  Circle: () => <span data-testid="circle-icon">•</span>,
  Loader2: () => <span data-testid="loader-icon" className="animate-spin">⟳</span>,
}))

// Mock the checkout actions
jest.mock("@/app/actions/checkout", () => ({
  getShippingOptionsAction: jest.fn(),
}))

import { getShippingOptionsAction } from "@/app/actions/checkout"

const mockGetShippingOptionsAction = getShippingOptionsAction as jest.MockedFunction<
  typeof getShippingOptionsAction
>

describe("DeliveryStep", () => {
  const defaultProps = {
    onBack: jest.fn(),
    onComplete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("shows loading state initially", () => {
    mockGetShippingOptionsAction.mockImplementation(() => new Promise(() => {}))

    render(<DeliveryStep {...defaultProps} />)

    expect(screen.getByTestId("loader-icon")).toBeInTheDocument()
  })

  it("loads and displays shipping options from API", async () => {
    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [
        { id: "so_1", name: "Express", amount: 1500, description: "Fast delivery" },
        { id: "so_2", name: "Standard", amount: 0, description: "Regular delivery" },
      ],
    })

    render(<DeliveryStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("Express")).toBeInTheDocument()
      expect(screen.getByText("Standard")).toBeInTheDocument()
    })
  })

  it("selects first option by default", async () => {
    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [
        { id: "so_1", name: "Express", amount: 1500 },
        { id: "so_2", name: "Standard", amount: 0 },
      ],
    })

    render(<DeliveryStep {...defaultProps} />)

    await waitFor(() => {
      const expressRadio = document.getElementById("so_1")
      expect(expressRadio).toBeChecked()
    })
  })

  it("allows selecting different shipping options", async () => {
    const user = userEvent.setup()

    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [
        { id: "so_1", name: "Express", amount: 1500 },
        { id: "so_2", name: "Standard", amount: 0 },
      ],
    })

    render(<DeliveryStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("Express")).toBeInTheDocument()
    })

    // Select standard option
    const standardLabel = screen.getByText("Standard").closest("label")
    await user.click(standardLabel!)

    const standardRadio = document.getElementById("so_2")
    expect(standardRadio).toBeChecked()
  })

  it("formats prices correctly", async () => {
    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [
        { id: "so_1", name: "Express", amount: 1500 },
        { id: "so_2", name: "Standard", amount: 0 },
      ],
    })

    render(<DeliveryStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("$15.00")).toBeInTheDocument()
      expect(screen.getByText("INCLUDED")).toBeInTheDocument()
    })
  })

  it("shows fallback options when API fails", async () => {
    mockGetShippingOptionsAction.mockResolvedValue({
      success: false,
      options: [],
    })

    render(<DeliveryStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("Standard Ground")).toBeInTheDocument()
      expect(screen.getByText("Express Air")).toBeInTheDocument()
      expect(screen.getByText("Heavy Freight")).toBeInTheDocument()
    })
  })

  it("shows fallback options on API error", async () => {
    mockGetShippingOptionsAction.mockRejectedValue(new Error("API Error"))

    render(<DeliveryStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("Standard Ground")).toBeInTheDocument()
    })
  })

  it("calls onBack when back button is clicked", async () => {
    const user = userEvent.setup()

    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [{ id: "so_1", name: "Standard", amount: 0 }],
    })

    render(<DeliveryStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("Back")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Back"))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it("calls onComplete with selected method ID on submit", async () => {
    const user = userEvent.setup()
    const onComplete = jest.fn().mockResolvedValue(undefined)

    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [
        { id: "so_1", name: "Express", amount: 1500 },
        { id: "so_2", name: "Standard", amount: 0 },
      ],
    })

    render(<DeliveryStep {...defaultProps} onComplete={onComplete} />)

    await waitFor(() => {
      expect(screen.getByText("Continue to Payment")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Continue to Payment"))

    expect(onComplete).toHaveBeenCalledWith("so_1")
  })

  it("shows loading state during submission", async () => {
    const user = userEvent.setup()
    let resolveComplete: () => void
    const onComplete = jest.fn().mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveComplete = resolve
      })
    )

    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [{ id: "so_1", name: "Standard", amount: 0 }],
    })

    render(<DeliveryStep {...defaultProps} onComplete={onComplete} />)

    await waitFor(() => {
      expect(screen.getByText("Continue to Payment")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Continue to Payment"))

    expect(screen.getByText("Saving...")).toBeInTheDocument()

    // Resolve the promise
    resolveComplete!()

    await waitFor(() => {
      expect(screen.queryByText("Saving...")).not.toBeInTheDocument()
    })
  })

  it("disables submit button while loading", () => {
    mockGetShippingOptionsAction.mockImplementation(() => new Promise(() => {}))

    render(<DeliveryStep {...defaultProps} />)

    expect(screen.getByText("Continue to Payment")).toBeDisabled()
  })

  it("disables back button while submitting", async () => {
    const user = userEvent.setup()
    const onComplete = jest.fn().mockImplementation(
      () => new Promise<void>(() => {})
    )

    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [{ id: "so_1", name: "Standard", amount: 0 }],
    })

    render(<DeliveryStep {...defaultProps} onComplete={onComplete} />)

    await waitFor(() => {
      expect(screen.getByText("Continue to Payment")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Continue to Payment"))

    expect(screen.getByText("Back")).toBeDisabled()
  })

  it("displays shipping option descriptions", async () => {
    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [
        {
          id: "so_1",
          name: "Express",
          amount: 1500,
          description: "1-2 business days",
        },
      ],
    })

    render(<DeliveryStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("1-2 business days")).toBeInTheDocument()
    })
  })
})
