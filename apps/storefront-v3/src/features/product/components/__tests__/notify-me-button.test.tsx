import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NotifyMeButton } from "../notify-me-button"

const mockAddAlert = jest.fn()
const mockHasAlert = jest.fn()
const mockRemoveAlertByProduct = jest.fn()
const mockToast = jest.fn()
let mockCustomerEmail: string | undefined
let mockIsAuthenticated = false

jest.mock("lucide-react", () => ({
  Bell: () => <span data-testid="bell-icon" />,
  BellOff: () => <span data-testid="bell-off-icon" />,
}))

jest.mock("@/context/inventory-alert-context", () => ({
  useInventoryAlerts: () => ({
    addAlert: (...args: unknown[]) => mockAddAlert(...args),
    customerEmail: mockCustomerEmail,
    hasAlert: (...args: unknown[]) => mockHasAlert(...args),
    isAuthenticated: mockIsAuthenticated,
    removeAlertByProduct: (...args: unknown[]) =>
      mockRemoveAlertByProduct(...args),
  }),
}))

jest.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({
    toast: (...args: unknown[]) => mockToast(...args),
  }),
}))

const props = {
  productId: "prod_123",
  productHandle: "test-product",
  productTitle: "Test Product",
  variantId: "variant_123",
  variantTitle: "Black - 180",
}

describe("NotifyMeButton", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHasAlert.mockReturnValue(false)
    mockAddAlert.mockResolvedValue({ success: true })
    mockRemoveAlertByProduct.mockResolvedValue({ success: true })
    mockCustomerEmail = undefined
    mockIsAuthenticated = false
  })

  it("subscribes guests with an entered email address", async () => {
    const user = userEvent.setup()

    render(<NotifyMeButton {...props} />)

    await user.type(
      screen.getByRole("textbox", { name: /email address/i }),
      "guest@example.com"
    )
    await user.click(screen.getByRole("button", { name: /notify me/i }))

    await waitFor(() => {
      expect(mockAddAlert).toHaveBeenCalledWith({
        email: "guest@example.com",
        productId: "prod_123",
        productHandle: "test-product",
        productTitle: "Test Product",
        variantId: "variant_123",
        variantTitle: "Black - 180",
      })
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Alert Subscribed",
        })
      )
    })
  })

  it("prefills the account email for signed-in customers", async () => {
    const user = userEvent.setup()
    mockIsAuthenticated = true
    mockCustomerEmail = "ava@example.com"

    render(<NotifyMeButton {...props} />)

    expect(screen.getByRole("textbox", { name: /email address/i })).toHaveValue(
      "ava@example.com"
    )
    await user.click(screen.getByRole("button", { name: /notify me/i }))

    await waitFor(() => {
      expect(mockAddAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "ava@example.com",
        })
      )
    })
  })

  it("validates guest email before subscribing", async () => {
    const user = userEvent.setup()

    render(<NotifyMeButton {...props} />)

    await user.type(screen.getByRole("textbox", { name: /email address/i }), "nope")
    await user.click(screen.getByRole("button", { name: /notify me/i }))

    expect(mockAddAlert).not.toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Email Required",
      })
    )
  })

  it("removes the alert when the customer is already subscribed", async () => {
    const user = userEvent.setup()
    mockHasAlert.mockReturnValue(true)

    render(<NotifyMeButton {...props} />)

    await user.click(screen.getByRole("button", { name: /already notified/i }))

    await waitFor(() => {
      expect(mockRemoveAlertByProduct).toHaveBeenCalledWith(
        "prod_123",
        "variant_123"
      )
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Alert Removed",
        })
      )
    })
  })
})
