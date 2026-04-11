import { render, screen } from "@testing-library/react"
import { StockStatusBadge, getStockStatus } from "../stock-status-badge"

jest.mock("lucide-react", () => ({
  CheckCircle2: () => <span data-testid="check-icon" />,
  AlertTriangle: () => <span data-testid="alert-icon" />,
  XCircle: () => <span data-testid="x-icon" />,
}))

describe("getStockStatus", () => {
  it("marks preorder variants as preorder instead of out of stock", () => {
    const result = getStockStatus({
      inventory_quantity: 0,
      manage_inventory: true,
      preorder_variant: {
        status: "enabled",
        available_date: "2999-01-01T00:00:00.000Z",
      },
    } as never)

    expect(result.status).toBe("preorder")
    expect(result.quantity).toBe(0)
  })

  it("keeps non-preorder zero inventory variants out of stock", () => {
    const result = getStockStatus({
      inventory_quantity: 0,
      manage_inventory: true,
    } as never)

    expect(result.status).toBe("out-of-stock")
  })
})

describe("StockStatusBadge", () => {
  it("renders preorder messaging", () => {
    render(
      <StockStatusBadge
        variant={
          {
            inventory_quantity: 0,
            manage_inventory: true,
            preorder_variant: {
              status: "enabled",
              available_date: "2999-01-01T00:00:00.000Z",
            },
          } as never
        }
      />
    )

    expect(screen.getByText("Pre-order")).toBeInTheDocument()
    expect(screen.queryByText(/Available on/i)).not.toBeInTheDocument()
  })
})
