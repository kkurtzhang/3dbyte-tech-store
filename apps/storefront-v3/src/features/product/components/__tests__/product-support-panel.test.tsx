import { render, screen } from "@testing-library/react"
import { ProductSupportPanel } from "../product-support-panel"

jest.mock("lucide-react", () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "__esModule") return true
        return (props: Record<string, unknown>) => <svg {...props} data-testid={`icon-${String(prop).toLowerCase()}`} />
      },
    }
  )
)

describe("ProductSupportPanel", () => {
  it("renders shipping, returns, and support help links", () => {
    render(<ProductSupportPanel />)

    expect(screen.getByText("Before You Order")).toBeInTheDocument()
    expect(screen.getByText("Delivery, Returns, and Compatibility Help")).toBeInTheDocument()

    // Check shipping link
    const shippingLink = screen.getByRole("link", { name: /dispatch & shipping/i })
    expect(shippingLink).toHaveAttribute("href", "/shipping")
    expect(screen.getByText("Delivery windows, shipping options, and restricted-item notes.")).toBeInTheDocument()

    // Check returns link
    const returnsLink = screen.getByRole("link", { name: /returns policy/i })
    expect(returnsLink).toHaveAttribute("href", "/returns")
    expect(screen.getByText("Straightforward returns if the part is not the right fit.")).toBeInTheDocument()

    // Check contact link
    const contactLink = screen.getByRole("link", { name: /need compatibility help/i })
    expect(contactLink).toHaveAttribute("href", "/contact")
    expect(screen.getByText("Contact support before ordering if you want a second check.")).toBeInTheDocument()
  })
})
