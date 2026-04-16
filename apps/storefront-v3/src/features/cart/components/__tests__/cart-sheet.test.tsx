import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { CartSheet } from "../cart-sheet"

const mockUseCart = jest.fn()
let mockPathname = "/"

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string
    children: React.ReactNode
    onClick?: React.MouseEventHandler<HTMLAnchorElement>
  }) => <a href={href} onClick={onClick} {...props}>{children}</a>,
}))

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}))

jest.mock("lucide-react", () => ({
  ShoppingCart: () => <span data-testid="shopping-cart-icon" />,
}))

jest.mock("@/components/ui/button", () => ({
  __esModule: true,
  Button: ({
    children,
    asChild,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean
    children: React.ReactNode
  }) =>
    asChild && React.isValidElement(children)
      ? React.cloneElement(children, {
          ...props,
          onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
            children.props.onClick?.(event)
            onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>)
          },
        })
      : <button onClick={onClick} {...props}>{children}</button>,
}))

jest.mock("@/components/ui/sheet", () => ({
  __esModule: true,
  Sheet: ({
    children,
    open = false,
    onOpenChange,
  }: {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }) => (
    <div data-open={open}>
      <button type="button" onClick={() => onOpenChange?.(!open)}>
        Toggle Sheet
      </button>
      {open ? children : null}
    </div>
  ),
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}))

jest.mock("@/context/cart-context", () => ({
  useCart: () => mockUseCart(),
}))

jest.mock("../cart-item", () => ({
  CartItem: () => <div>Cart Item</div>,
}))

jest.mock("../bundle-cart-group", () => ({
  BundleCartGroup: ({ group }: { group: { bundleTitle?: string | null } }) => (
    <div>Bundle Group: {group.bundleTitle ?? "Product Bundle"}</div>
  ),
}))

describe("CartSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPathname = "/"
  })

  const openCartSheet = () => {
    fireEvent.click(screen.getByRole("button", { name: "Toggle Sheet" }))
  }

  it("shows normalized empty-cart copy", () => {
    mockUseCart.mockReturnValue({
      cart: null,
      isLoading: false,
    })

    render(<CartSheet />)
    openCartSheet()

    expect(screen.getByText("Cart (0)")).toBeInTheDocument()
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument()
    expect(screen.getByText("Add products to your cart to get started.")).toBeInTheDocument()
    expect(screen.getByText("Proceed to Checkout")).toBeInTheDocument()
  })

  it("shows normalized loading copy", () => {
    mockUseCart.mockReturnValue({
      cart: null,
      isLoading: true,
    })

    render(<CartSheet />)
    openCartSheet()

    expect(screen.getByText("Loading cart...")).toBeInTheDocument()
  })

  it("groups bundled line items in the cart sheet", () => {
    mockUseCart.mockReturnValue({
      isLoading: false,
      cart: {
        total: 200,
        region: {
          currency_code: "usd",
        },
        items: [
          {
            id: "line_1",
            quantity: 1,
            unit_price: 75,
            metadata: {
              bundle_id: "bundle_1",
              bundle_title: "Starter Bundle",
              bundle_product_handle: "starter-bundle",
              bundle_quantity: 1,
            },
          },
          {
            id: "line_2",
            quantity: 1,
            unit_price: 25,
            metadata: {
              bundle_id: "bundle_1",
              bundle_title: "Starter Bundle",
              bundle_product_handle: "starter-bundle",
              bundle_quantity: 1,
            },
          },
          {
            id: "line_3",
            quantity: 2,
            unit_price: 50,
            metadata: null,
          },
        ],
      },
    })

    render(<CartSheet />)
    openCartSheet()

    expect(screen.getByText("Cart (3)")).toBeInTheDocument()
    expect(screen.getByText("Bundle Group: Starter Bundle")).toBeInTheDocument()
    expect(screen.getByText("Cart Item")).toBeInTheDocument()
  })

  it("shows compact preorder and bundle notices in the footer", () => {
    mockUseCart.mockReturnValue({
      isLoading: false,
      cart: {
        total: 200,
        region: {
          currency_code: "usd",
        },
        items: [
          {
            id: "line_1",
            quantity: 1,
            unit_price: 75,
            metadata: {
              bundle_id: "bundle_1",
              bundle_title: "Starter Bundle",
              bundle_quantity: 1,
            },
            variant: {
              preorder_variant: {
                status: "enabled",
                available_date: "2999-01-01T00:00:00.000Z",
                prices: [{ amount: 75, currency_code: "usd" }],
              },
            },
          },
        ],
      },
    })

    render(<CartSheet />)
    openCartSheet()

    expect(screen.getByText(/Includes pre-order items/i)).toBeInTheDocument()
    expect(screen.getByText(/1 bundle/i)).toBeInTheDocument()
  })

  it("closes the cart sheet after navigating to checkout", () => {
    mockUseCart.mockReturnValue({
      isLoading: false,
      cart: {
        total: 100,
        region: {
          currency_code: "usd",
        },
        items: [
          {
            id: "line_1",
            quantity: 1,
            unit_price: 100,
            metadata: null,
          },
        ],
      },
    })

    const { rerender } = render(<CartSheet />)
    openCartSheet()

    expect(screen.getByText("Proceed to Checkout")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Proceed to Checkout"))
    expect(screen.queryByText("Subtotal")).not.toBeInTheDocument()

    mockPathname = "/checkout"
    rerender(<CartSheet />)

    expect(screen.queryByText("Proceed to Checkout")).not.toBeInTheDocument()
  })
})
