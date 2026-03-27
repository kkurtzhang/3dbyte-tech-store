import { render, screen } from "@testing-library/react"
import { PaymentMethodSupport } from "../payment-method-support"

jest.mock("lucide-react", () => ({
  ShieldCheck: () => <span data-testid="shield-icon" />,
}))

jest.mock("@icons-pack/react-simple-icons", () => ({
  SiAmericanexpress: () => <span aria-label="American Express" />,
  SiApplepay: () => <span aria-label="Apple Pay" />,
  SiGooglepay: () => <span aria-label="Google Pay" />,
  SiMastercard: () => <span aria-label="Mastercard" />,
  SiStripe: () => <span aria-label="Stripe" />,
  SiVisa: () => <span aria-label="Visa" />,
}))

describe("PaymentMethodSupport", () => {
  it("renders Stripe and supported payment labels", () => {
    render(<PaymentMethodSupport />)

    expect(screen.getByText(/secure payments/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/stripe/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/visa/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/mastercard/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/american express/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/apple pay/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/google pay/i).length).toBeGreaterThan(0)
  })
})
