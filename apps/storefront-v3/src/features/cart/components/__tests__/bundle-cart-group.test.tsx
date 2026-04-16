import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BundleCartGroup } from "../bundle-cart-group"

const removeBundle = jest.fn()
const updateBundle = jest.fn()

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href}>{children}</a>,
}))

jest.mock("lucide-react", () => ({
  Trash2: () => <span data-testid="trash-icon" />,
}))

jest.mock("@/context/cart-context", () => ({
  useCart: () => ({
    removeBundle,
    updateBundle,
  }),
}))

jest.mock("../cart-item", () => ({
  CartItem: () => <div>Cart Item</div>,
}))

describe("BundleCartGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const group = {
    type: "bundle" as const,
    bundleId: "bundle_1",
    bundleTitle: "Starter Bundle",
    bundleProductHandle: "starter-bundle",
    quantity: 2,
    items: [
      {
        id: "line_1",
        unit_price: 75,
        quantity: 2,
      },
      {
        id: "line_2",
        unit_price: 25,
        quantity: 4,
      },
    ],
  }

  it("shows item count instead of the old bundle summary copy", () => {
    render(<BundleCartGroup group={group as never} currencyCode="usd" />)

    expect(screen.getByText("2 items")).toBeInTheDocument()
    expect(screen.queryByText(/included line items/i)).not.toBeInTheDocument()
  })

  it("updates the grouped bundle quantity", async () => {
    const user = userEvent.setup()

    render(<BundleCartGroup group={group as never} currencyCode="usd" />)

    await user.click(screen.getByRole("button", { name: /increase starter bundle quantity/i }))

    expect(updateBundle).toHaveBeenCalledWith("bundle_1", 3)
  })
})
