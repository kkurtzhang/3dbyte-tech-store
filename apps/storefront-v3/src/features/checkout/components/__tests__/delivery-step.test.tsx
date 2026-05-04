import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DeliveryStep } from "../delivery-step"

jest.mock("lucide-react", () => ({
  Truck: () => <span data-testid="truck-icon">truck</span>,
  Zap: () => <span data-testid="zap-icon">zap</span>,
  Loader2: () => (
    <span data-testid="loader-icon" className="animate-spin">
      loading
    </span>
  ),
  Circle: () => <span data-testid="circle-icon">circle</span>,
}))

jest.mock("@/app/actions/checkout", () => ({
  getShippingOptionsAction: jest.fn(),
  getLiveShippingRatesAction: jest.fn(),
}))

import {
  getLiveShippingRatesAction,
  getShippingOptionsAction,
} from "@/app/actions/checkout"

const mockGetShippingOptionsAction =
  getShippingOptionsAction as jest.MockedFunction<
    typeof getShippingOptionsAction
  >
const mockGetLiveShippingRatesAction =
  getLiveShippingRatesAction as jest.MockedFunction<
    typeof getLiveShippingRatesAction
  >

describe("DeliveryStep", () => {
  const defaultProps = {
    onBack: jest.fn(),
    onComplete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetLiveShippingRatesAction.mockResolvedValue({
      success: false,
      rates: [],
      error: "Karrio unavailable",
    })
  })

  it("shows loading state initially", () => {
    mockGetShippingOptionsAction.mockImplementation(
      () => new Promise(() => {})
    )

    render(<DeliveryStep {...defaultProps} />)

    expect(screen.getByTestId("loader-icon")).toBeInTheDocument()
  })

  it("loads and displays shipping options from API", async () => {
    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [
        { id: "so_1", name: "Express", amount: 15, description: "Fast delivery" },
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
    const onSelectedEstimateChange = jest.fn()

    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [
        { id: "so_1", name: "Express", amount: 15 },
        { id: "so_2", name: "Standard", amount: 0 },
      ],
    })

    render(
      <DeliveryStep
        {...defaultProps}
        onSelectedEstimateChange={onSelectedEstimateChange}
      />
    )

    await waitFor(() => {
      expect(document.getElementById("so_1")).toBeChecked()
    })
    expect(onSelectedEstimateChange).toHaveBeenCalledWith(15)
  })

  it("allows selecting different shipping options", async () => {
    const user = userEvent.setup()
    const onSelectedEstimateChange = jest.fn()

    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [
        { id: "so_1", name: "Express", amount: 15 },
        { id: "so_2", name: "Standard", amount: 0 },
      ],
    })

    render(
      <DeliveryStep
        {...defaultProps}
        onSelectedEstimateChange={onSelectedEstimateChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Express")).toBeInTheDocument()
    })

    const standardLabel = screen.getByText("Standard").closest("label")
    await user.click(standardLabel!)

    const standardRadio = document.getElementById("so_2")
    expect(standardRadio).toBeChecked()
    expect(onSelectedEstimateChange).toHaveBeenCalledWith(0)
  })

  it("formats prices correctly", async () => {
    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [
        { id: "so_1", name: "Express", amount: 15 },
        { id: "so_2", name: "Standard", amount: 0 },
      ],
    })

    render(<DeliveryStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("$15.00")).toBeInTheDocument()
      expect(screen.getByText("INCLUDED")).toBeInTheDocument()
    })
  })

  it("shows customer-facing Aramex service labels for Karrio options", async () => {
    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [
        {
          id: "so_standard",
          name: "Karrio-Standard",
          amount: 11.19,
          description: "Economy",
        },
        {
          id: "so_express",
          name: "Karrio-Express",
          amount: 17.79,
          description: "Priority",
        },
      ],
    })

    render(<DeliveryStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("Aramex Economy")).toBeInTheDocument()
      expect(screen.getByText("Aramex Priority")).toBeInTheDocument()
    })

    expect(screen.queryByText("Karrio-Standard")).not.toBeInTheDocument()
    expect(screen.queryByText("Karrio-Express")).not.toBeInTheDocument()
  })

  it("shows an error when shipping options are unavailable", async () => {
    mockGetShippingOptionsAction.mockResolvedValue({
      success: false,
      error: "Unable to calculate postage",
      options: [],
    })

    render(<DeliveryStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("Unable to calculate postage")).toBeInTheDocument()
    })

    expect(screen.getByText("Continue to Payment")).toBeDisabled()
  })

  it("shows an error on API exception", async () => {
    mockGetShippingOptionsAction.mockRejectedValue(new Error("API Error"))

    render(<DeliveryStep {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText("Unable to load shipping methods. Please try again.")
      ).toBeInTheDocument()
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
        { id: "so_1", name: "Express", amount: 15 },
        { id: "so_2", name: "Standard", amount: 0 },
      ],
    })

    render(<DeliveryStep {...defaultProps} onComplete={onComplete} />)

    await waitFor(() => {
      expect(screen.getByText("Continue to Payment")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Continue to Payment"))

    expect(onComplete).toHaveBeenCalledWith(
      "so_1",
      undefined,
      { name: "Express", price: 15 }
    )
  })

  it("submits a Medusa shipping option ID with the selected live Karrio rate data", async () => {
    const user = userEvent.setup()
    const onComplete = jest.fn().mockResolvedValue(undefined)

    mockGetLiveShippingRatesAction.mockResolvedValue({
      success: true,
      rates: [
        {
          id: "rate_live_1",
          carrier: {
            id: "auspost",
            name: "Australia Post",
            slug: "australia-post",
          },
          service: "parcel_post",
          serviceName: "Parcel Post",
          totalCharge: 1295,
          currency: "AUD",
        },
      ],
    })
    mockGetShippingOptionsAction.mockResolvedValue({
      success: true,
      options: [
        {
          id: "so_calculated_1",
          name: "Karrio Calculated Shipping",
          amount: 12.95,
          description: "Live carrier rate",
          price_type: "calculated",
        },
      ],
    })

    render(<DeliveryStep {...defaultProps} onComplete={onComplete} />)

    await waitFor(() => {
      expect(screen.getByText("Parcel Post")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Continue to Payment"))

    expect(onComplete).toHaveBeenCalledWith(
      "so_calculated_1",
      {
        selected_rate_id: "rate_live_1",
        service: "parcel_post",
        service_name: "Parcel Post",
        carrier_id: "auspost",
        carrier_name: "Australia Post",
      },
      { name: "Parcel Post", price: 12.95 }
    )
    expect(onComplete).not.toHaveBeenCalledWith("rate_live_1")
  })

  it("shows loading state during submission", async () => {
    const user = userEvent.setup()
    let resolveComplete: () => void
    const onComplete = jest.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
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

    resolveComplete!()

    await waitFor(() => {
      expect(screen.queryByText("Saving...")).not.toBeInTheDocument()
    })
  })

  it("disables submit button while loading", () => {
    mockGetShippingOptionsAction.mockImplementation(
      () => new Promise(() => {})
    )

    render(<DeliveryStep {...defaultProps} />)

    expect(screen.getByText("Continue to Payment")).toBeDisabled()
  })

  it("disables back button while submitting", async () => {
    const user = userEvent.setup()
    const onComplete = jest
      .fn()
      .mockImplementation(() => new Promise<void>(() => {}))

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
          amount: 15,
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
