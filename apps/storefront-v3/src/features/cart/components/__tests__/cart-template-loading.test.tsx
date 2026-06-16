import { render, screen } from "@testing-library/react"

import { CartTemplate } from "../cart-template"

jest.mock("lucide-react", () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "__esModule") return true
        return (props: Record<string, unknown>) => <svg {...props} />
      },
    },
  ),
)

jest.mock("@/context/cart-context", () => ({
  useCart: () => ({
    cart: null,
    isLoading: true,
  }),
}))

jest.mock("@/context/saved-items-context", () => ({
  useSavedItems: () => ({
    savedItems: [],
  }),
}))

jest.mock("../cart-item", () => ({
  CartItem: () => null,
}))

jest.mock("../cart-notices", () => ({
  CartNotices: () => null,
}))

jest.mock("../bundle-cart-group", () => ({
  BundleCartGroup: () => null,
}))

jest.mock("@/features/order/components/order-totals-summary", () => ({
  OrderTotalsSummary: () => null,
}))

describe("CartTemplate loading state", () => {
  it("shows a stable cart skeleton while client cart state hydrates", () => {
    render(<CartTemplate />)

    expect(
      screen.getByRole("status", { name: /loading cart/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId("cart-page-skeleton")).toBeInTheDocument()
    expect(screen.queryByText("Loading cart...")).not.toBeInTheDocument()
  })
})
