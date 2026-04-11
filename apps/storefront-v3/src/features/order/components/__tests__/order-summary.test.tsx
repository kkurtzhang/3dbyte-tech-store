import { render, screen } from "@testing-library/react"
import { OrderSummary } from "../order-summary"
import type { MedusaOrder } from "@/lib/medusa/types"

jest.mock("lucide-react", () => ({
  CheckCircle2: () => <span />,
}))

jest.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}))

const createOrder = (overrides: Partial<MedusaOrder> = {}): MedusaOrder =>
  ({
    id: "order_1",
    status: "completed",
    currency_code: "usd",
    created_at: "2025-01-01T00:00:00.000Z",
    subtotal: 1000,
    total: 1000,
    items: [
      {
        id: "item_1",
        title: "Test Product",
        quantity: 1,
        unit_price: 1000,
        variant: {
          id: "variant_1",
          title: "Default Variant",
          preorder_variant: {
            status: "enabled",
            available_date: "2999-01-01T00:00:00.000Z",
            prices: [{ amount: 800, currency_code: "usd" }],
          },
        },
      },
    ],
    ...overrides,
  }) as MedusaOrder

describe("OrderSummary", () => {
  it("shows preorder availability messaging", () => {
    render(<OrderSummary order={createOrder()} />)

    expect(screen.getByText(/Pre-order available on/i)).toBeInTheDocument()
    expect(screen.getByText(/Pre-order price:/i)).toBeInTheDocument()
    expect(screen.getByText(/Regular price:/i)).toBeInTheDocument()
  })
})
