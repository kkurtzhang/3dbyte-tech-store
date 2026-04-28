import { render, screen } from "@testing-library/react"
import { NotifyMeButton } from "../notify-me-button"

jest.mock("lucide-react", () => ({
  Bell: () => <span data-testid="bell-icon" />,
  BellOff: () => <span data-testid="bell-off-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
  X: () => <span data-testid="close-icon" />,
}))

jest.mock("@/context/inventory-alert-context", () => ({
  useInventoryAlerts: () => ({
    addAlert: jest.fn(),
    hasAlert: jest.fn(() => false),
    removeAlertByProduct: jest.fn(),
  }),
}))

jest.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

describe("NotifyMeButton", () => {
  it("renders a visible trigger button while the dialog is closed", () => {
    render(
      <NotifyMeButton
        productId="prod_123"
        productHandle="test-product"
        productTitle="Test Product"
        variantId="variant_123"
        variantTitle="Black"
      />
    )

    expect(screen.getByRole("button", { name: /notify me/i })).toBeInTheDocument()
  })
})
