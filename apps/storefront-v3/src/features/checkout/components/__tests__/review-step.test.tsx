import { render, screen } from "@testing-library/react"
import { ReviewStep } from "../review-step"

const onBack = jest.fn()
const onComplete = jest.fn()

jest.mock("lucide-react", () => ({
  Loader2: () => <span />,
  Package: () => <span />,
  CreditCard: () => <span />,
  MapPin: () => <span />,
}))

const createCartData = (overrides: Record<string, unknown> = {}) => ({
  items: [
    {
      id: "bundle_line_1",
      title: "Starter Bundle Part 1",
      quantity: 1,
      unit_price: 900,
      metadata: {
        bundle_id: "bundle_123",
        bundle_title: "Starter Bundle",
        bundle_quantity: 1,
      },
      product: {
        title: "Starter Bundle Part 1",
        thumbnail: "/bundle-1.jpg",
      },
      variant: {
        title: "Default Title",
        preorder_variant: {
          status: "enabled" as const,
          available_date: "2999-01-01T00:00:00.000Z",
          prices: [{ amount: 900, currency_code: "usd" }],
        },
      },
    },
    {
      id: "bundle_line_2",
      title: "Starter Bundle Part 2",
      quantity: 1,
      unit_price: 600,
      metadata: {
        bundle_id: "bundle_123",
        bundle_title: "Starter Bundle",
        bundle_quantity: 1,
      },
      product: {
        title: "Starter Bundle Part 2",
        thumbnail: "/bundle-2.jpg",
      },
      variant: {
        title: "Default Title",
      },
    },
    {
      id: "standalone_line",
      title: "Standalone Item",
      quantity: 2,
      unit_price: 500,
      metadata: null,
      product: {
        title: "Standalone Item",
        thumbnail: "/single.jpg",
      },
      variant: {
        title: "Large",
      },
    },
  ],
  shippingAddress: {
    first_name: "Ada",
    last_name: "Lovelace",
    address_1: "123 Example St",
    city: "Hobart",
    province: "TAS",
    postal_code: "7000",
    country_code: "au",
  },
  email: "ada@example.com",
  shippingMethod: {
    name: "Standard Shipping",
    price: 1000,
  },
  currencyCode: "usd",
  ...overrides,
})

describe("ReviewStep", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("groups bundled items and shows preorder delivery expectations", () => {
    render(
      <ReviewStep
        cartData={createCartData()}
        onBack={onBack}
        onComplete={onComplete}
      />
    )

    expect(screen.getByText("Starter Bundle")).toBeInTheDocument()
    expect(screen.getByText(/Pre-order items ship when available/i)).toBeInTheDocument()
    expect(screen.getByText(/Jan 1, 2999/i)).toBeInTheDocument()
    expect(screen.getByText("Standalone Item")).toBeInTheDocument()
  })

  it("shows a mixed-cart notice when preorder and regular items coexist", () => {
    render(
      <ReviewStep
        cartData={createCartData()}
        onBack={onBack}
        onComplete={onComplete}
      />
    )

    expect(
      screen.getByText(/contains both in-stock and pre-order items/i)
    ).toBeInTheDocument()
  })
})
