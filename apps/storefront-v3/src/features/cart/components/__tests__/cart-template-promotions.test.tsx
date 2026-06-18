import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { CartTemplate } from "../cart-template"

const applyPromotion = jest.fn()
const removePromotion = jest.fn()
let mockCart: Record<string, unknown> | null

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
    cart: mockCart,
    isLoading: false,
    applyPromotion,
    removePromotion,
  }),
}))

jest.mock("@/context/saved-items-context", () => ({
  useSavedItems: () => ({
    savedItems: [],
  }),
}))

jest.mock("../cart-item", () => ({
  CartItem: ({ item }: { item: { title?: string } }) => (
    <div>{item.title || "Cart item"}</div>
  ),
}))

jest.mock("../cart-notices", () => ({
  CartNotices: () => null,
}))

jest.mock("../bundle-cart-group", () => ({
  BundleCartGroup: () => null,
}))

jest.mock("@/features/order/components/order-totals-summary", () => ({
  OrderTotalsSummary: ({
    discountTotal,
    total,
  }: {
    discountTotal?: number
    total: number
  }) => (
    <div>
      <span>Discount total: {discountTotal}</span>
      <span>Summary total: {total}</span>
    </div>
  ),
}))

describe("CartTemplate promotions", () => {
  beforeEach(() => {
    applyPromotion.mockReset()
    removePromotion.mockReset()
    mockCart = {
      id: "cart_1",
      items: [
        {
          id: "line_1",
          title: "PETG Black",
          quantity: 1,
        },
      ],
      promotions: [{ id: "promo_1", code: "PETG10" }],
      discount_total: 5,
      item_total: 40,
      tax_total: 4,
      total: 35,
      region: { currency_code: "aud" },
    }
  })

  it("lets customers apply and remove promotion codes while showing discounted totals", async () => {
    render(<CartTemplate />)

    expect(screen.getByText("Discount total: 5")).toBeInTheDocument()
    expect(screen.getByText("Summary total: 35")).toBeInTheDocument()
    expect(screen.getByText("PETG10")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/promotion code/i), {
      target: { value: "NEW10" },
    })
    fireEvent.click(screen.getByRole("button", { name: /apply/i }))

    await waitFor(() => {
      expect(applyPromotion).toHaveBeenCalledWith("NEW10")
    })

    fireEvent.click(screen.getByRole("button", { name: /remove PETG10/i }))

    await waitFor(() => {
      expect(removePromotion).toHaveBeenCalledWith("PETG10")
    })
  })
})
