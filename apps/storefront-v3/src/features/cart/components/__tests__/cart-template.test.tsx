import React from "react"
import { render, screen } from "@testing-library/react"
import { CartTemplate } from "../cart-template"

const mockUseCart = jest.fn()
const mockUseSavedItems = jest.fn()

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href} {...props}>{children}</a>,
}))

jest.mock("lucide-react", () => ({
  ArrowRight: () => <span />,
  Bookmark: () => <span />,
  AlertTriangle: () => <span />,
  Clock3: () => <span />,
  Package: () => <span />,
}))

jest.mock("@/components/ui/button", () => ({
  __esModule: true,
  Button: ({
    children,
    asChild,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean
    children: React.ReactNode
  }) =>
    asChild && React.isValidElement(children)
      ? React.cloneElement(children, props)
      : <button {...props}>{children}</button>,
}))

jest.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}))

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock("@/context/cart-context", () => ({
  useCart: () => mockUseCart(),
}))

jest.mock("@/context/saved-items-context", () => ({
  useSavedItems: () => mockUseSavedItems(),
}))

jest.mock("../cart-item", () => ({
  CartItem: ({ item }: { item: { title: string } }) => <div>{item.title}</div>,
}))

jest.mock("../bundle-cart-group", () => ({
  BundleCartGroup: ({ group }: { group: { bundleTitle?: string | null } }) => (
    <div>{group.bundleTitle ?? "Product Bundle"}</div>
  ),
}))

describe("CartTemplate", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSavedItems.mockReturnValue({
      savedItems: [],
    })
  })

  it("shows a visible purchase-status banner for preorder bundle mixed carts", () => {
    mockUseCart.mockReturnValue({
      isLoading: false,
      cart: {
        total: 220,
        region: {
          currency_code: "usd",
        },
        items: [
          {
            id: "line_1",
            title: "Bundle Part 1",
            quantity: 1,
            unit_price: 90,
            metadata: {
              bundle_id: "bundle_1",
              bundle_title: "Starter Bundle",
              bundle_quantity: 1,
            },
            variant: {
              prices: [{ amount: 120, currency_code: "usd" }],
              preorder_variant: {
                status: "enabled",
                available_date: "2999-01-01T00:00:00.000Z",
                prices: [{ amount: 90, currency_code: "usd" }],
              },
            },
          },
          {
            id: "line_2",
            title: "Bundle Part 2",
            quantity: 1,
            unit_price: 60,
            metadata: {
              bundle_id: "bundle_1",
              bundle_title: "Starter Bundle",
              bundle_quantity: 1,
            },
            variant: {
              prices: [{ amount: 80, currency_code: "usd" }],
            },
          },
          {
            id: "line_3",
            title: "Regular Item",
            quantity: 1,
            unit_price: 70,
            metadata: null,
            variant: {
              prices: [{ amount: 70, currency_code: "usd" }],
            },
          },
        ],
      },
    })

    render(<CartTemplate />)

    expect(screen.getByText("Purchase Status")).toBeInTheDocument()
    expect(
      screen.getByText(/Pre-order and bundle details are active for this cart/i)
    ).toBeInTheDocument()
    expect(screen.getByText("Mixed Cart")).toBeInTheDocument()
    expect(screen.getByText("Pre-order ETA")).toBeInTheDocument()
    expect(screen.getByText("Bundles")).toBeInTheDocument()
    expect(screen.getByText("Delivery")).toBeInTheDocument()
  })
})
