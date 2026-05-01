import { render, screen } from "@testing-library/react"
import { CartItem } from "../cart-item"
import type { MedusaCartLineItem } from "@/lib/medusa/types"

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

jest.mock("lucide-react", () => ({
  Minus: () => <span />,
  Plus: () => <span />,
  Trash2: () => <span />,
  Bookmark: () => <span />,
  ImageOff: () => <span />,
}))

jest.mock("@/context/cart-context", () => ({
  useCart: () => ({
    updateItem: jest.fn(),
    removeItem: jest.fn(),
  }),
}))

jest.mock("@/context/saved-items-context", () => ({
  useSavedItems: () => ({
    saveItem: jest.fn(),
    isSaved: () => false,
  }),
}))

const createItem = (overrides: Partial<MedusaCartLineItem> = {}): MedusaCartLineItem =>
  ({
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
      product: {
        id: "prod_1",
        title: "Test Product",
        thumbnail: "/test.jpg",
      },
    },
    ...overrides,
  }) as MedusaCartLineItem

describe("CartItem", () => {
  it("shows preorder availability messaging", () => {
    render(<CartItem item={createItem()} currencyCode="usd" />)

    expect(screen.queryByText("Standard")).not.toBeInTheDocument()
    expect(screen.queryByText("Default Variant")).not.toBeInTheDocument()
    expect(screen.getByText(/Pre-order available on/i)).toBeInTheDocument()
    expect(screen.queryByText(/Pre-order price:/i)).not.toBeInTheDocument()
  })

  it("shows the actual preorder line price and the regular variant price separately", () => {
    render(
      <CartItem
        item={createItem({
          quantity: 3,
          unit_price: 19,
          variant: {
            id: "variant_1",
            title: "Default Variant",
            prices: [{ amount: 49, currency_code: "usd" }],
            preorder_variant: {
              status: "enabled",
              available_date: "2999-01-01T00:00:00.000Z",
              prices: [{ amount: 19, currency_code: "usd" }],
            },
            product: {
              id: "prod_1",
              title: "Test Product",
              thumbnail: "/test.jpg",
            },
          } as MedusaCartLineItem["variant"],
        })}
        currencyCode="usd"
      />
    )

    expect(screen.getByText("$19.00")).toBeInTheDocument()
    expect(screen.getByText("$49.00")).toHaveClass("line-through")
    expect(screen.queryByText(/Pre-order price:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Regular price:/i)).not.toBeInTheDocument()
    expect(screen.getByText("$57.00")).toBeInTheDocument()
  })

  it("shows sale pricing with the regular price struck through for non-preorder items", () => {
    render(
      <CartItem
        item={createItem({
          unit_price: 25,
          variant: {
            id: "variant_sale",
            title: "Default Variant",
            calculated_price: {
              calculated_amount: 25,
              original_amount: 40,
              currency_code: "usd",
            },
            product: {
              id: "prod_1",
              title: "Test Product",
              thumbnail: "/test.jpg",
            },
          } as MedusaCartLineItem["variant"],
        })}
        currencyCode="usd"
      />
    )

    expect(screen.getAllByText("$25.00").length).toBeGreaterThan(0)
    expect(screen.getByText("$40.00")).toHaveClass("line-through")
  })

  it("shows bundle metadata regular pricing when variant pricing is not available", () => {
    render(
      <CartItem
        item={createItem({
          unit_price: 41.32,
          metadata: {
            bundle_regular_unit_price: 48.03,
          },
          variant: {
            id: "variant_bundle",
            title: "Default Variant",
            product: {
              id: "prod_1",
              title: "Test Product",
              thumbnail: "/test.jpg",
            },
          } as MedusaCartLineItem["variant"],
        })}
        currencyCode="aud"
      />
    )

    expect(screen.getAllByText("A$41.32").length).toBeGreaterThan(0)
    expect(screen.getByText("A$48.03")).toHaveClass("line-through")
  })

  it("uses the pre-tax line subtotal when tax-inclusive item totals are present", () => {
    render(
      <CartItem
        item={createItem({
          unit_price: 46.08,
          subtotal: 46.08,
          total: 50.69,
          variant: {
            id: "variant_1",
            title: "Default Variant",
            product: {
              id: "prod_1",
              title: "Test Product",
              thumbnail: "/test.jpg",
            },
          } as MedusaCartLineItem["variant"],
        })}
        currencyCode="usd"
      />
    )

    expect(screen.getByText("$46.08")).toBeInTheDocument()
    expect(screen.queryByText("$50.69")).not.toBeInTheDocument()
  })

  it("falls back to the line-item thumbnail when the variant product thumbnail is missing", () => {
    render(
      <CartItem
        item={createItem({
          thumbnail: "/line-item-thumb.jpg",
          variant: {
            id: "variant_1",
            title: "Default Variant",
            preorder_variant: {
              status: "enabled",
              available_date: "2999-01-01T00:00:00.000Z",
              prices: [{ amount: 800, currency_code: "usd" }],
            },
            product: {
              id: "prod_1",
              title: "Test Product",
              thumbnail: null,
            },
          } as MedusaCartLineItem["variant"],
        })}
        currencyCode="usd"
      />
    )

    expect(screen.getByAltText("Test Product")).toHaveAttribute("src", "/line-item-thumb.jpg")
  })

  it("shows the selected variant title when it is a real variant", () => {
    render(
      <CartItem
        item={createItem({
          variant: {
            id: "variant_2",
            title: "Matte Black",
            product: {
              id: "prod_1",
              title: "Test Product",
              thumbnail: "/test.jpg",
            },
          } as MedusaCartLineItem["variant"],
        })}
        currencyCode="usd"
      />
    )

    expect(screen.getByText("Matte Black")).toBeInTheDocument()
  })

  it("shows the line-item variant title when the nested variant title is default", () => {
    render(
      <CartItem
        item={createItem({
          variant_title: "Power Tool Green",
          subtitle: "Power Tool Green",
          variant: {
            id: "variant_2",
            title: "Default Variant",
            product: {
              id: "prod_1",
              title: "Test Product",
              thumbnail: "/test.jpg",
            },
          } as MedusaCartLineItem["variant"],
        })}
        currencyCode="usd"
      />
    )

    expect(screen.getByText("Power Tool Green")).toBeInTheDocument()
  })
})
