import { useEffect } from "react"
import { render, screen } from "@testing-library/react"
import { CheckoutSummary } from "../checkout-summary"
import type { StoreCart } from "@medusajs/types"
import { CheckoutSummaryEstimateProvider, useCheckoutSummaryEstimate } from "../checkout-summary-estimate-context"

// Mock Next.js Image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    fill,
    className,
    sizes,
  }: {
    src: string
    alt: string
    fill?: boolean
    className?: string
    sizes?: string
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-fill={fill} data-sizes={sizes} className={className} />
  ),
}))

// Mock cart context — returns null so component falls back to SSR prop
jest.mock("@/context/cart-context", () => ({
  useCart: () => ({ cart: null, isLoading: false, refreshCart: jest.fn() }),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockCart = (overrides: any = {}): StoreCart =>
  ({
    id: "cart_1",
    region: {
      id: "reg_1",
      currency_code: "usd",
      name: "United States",
    },
    items: [
      {
        id: "item_1",
        title: "Test Product",
        quantity: 2,
        unit_price: 10,
        variant: {
          id: "variant_1",
          title: "Default Variant",
          product: {
            id: "prod_1",
            title: "Test Product",
            thumbnail: "/test-image.jpg",
          },
        },
      },
    ],
    subtotal: 20,
    total: 22,
    ...overrides,
  }) as unknown as StoreCart

describe("CheckoutSummary", () => {
  it("renders order summary header", () => {
    render(<CheckoutSummary cart={createMockCart()} />)

    expect(screen.getByText("Order summary")).toBeInTheDocument()
  })

  it("displays cart items", () => {
    const cart = createMockCart()
    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("Test Product")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument() // Quantity badge
  })

  it("shows product thumbnails", () => {
    const cart = createMockCart()
    render(<CheckoutSummary cart={cart} />)

    const image = screen.getByAltText("Test Product")
    expect(image).toHaveAttribute("src", "/test-image.jpg")
  })

  it("shows placeholder when no thumbnail", () => {
    const cart = createMockCart({
      items: [
        {
          id: "item_1",
          title: "No Image Product",
          quantity: 1,
          unit_price: 500,
          variant: {
            id: "variant_1",
            title: "Default Variant",
            product: {
              id: "prod_1",
              title: "No Image Product",
              thumbnail: null,
            },
          },
        },
      ],
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("No image")).toBeInTheDocument()
  })

  it("uses the Medusa line total when it differs from unit price times quantity", () => {
    const cart = createMockCart({
      items: [
        {
          id: "item_1",
          title: "Discounted Product",
          quantity: 3,
          unit_price: 19,
          total: 49,
          variant: {
            id: "variant_1",
            title: "Default Variant",
            product: {
              id: "prod_1",
              title: "Discounted Product",
              thumbnail: "/test.jpg",
            },
          },
        },
      ],
      subtotal: 49,
      total: 49,
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getAllByText("$49.00").length).toBeGreaterThan(0)
    expect(screen.queryByText("$0.49")).not.toBeInTheDocument()
    expect(screen.queryByText("$57.00")).not.toBeInTheDocument()
  })

  it("uses the pre-tax line subtotal when tax-inclusive item totals are present", () => {
    const cart = createMockCart({
      items: [
        {
          id: "item_1",
          title: "Taxed Product",
          quantity: 1,
          unit_price: 46.08,
          subtotal: 46.08,
          total: 50.69,
          variant: {
            id: "variant_1",
            title: "Default Variant",
            product: {
              id: "prod_1",
              title: "Taxed Product",
              thumbnail: "/test.jpg",
            },
          },
        },
      ],
      subtotal: 46.08,
      tax_total: 4.61,
      total: 50.69,
      shipping_address: { id: "addr_1" },
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getAllByText("$46.08").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$50.69")).toHaveLength(1)
  })

  it("displays variant title when not default", () => {
    const cart = createMockCart({
      items: [
        {
          id: "item_1",
          title: "Test Product",
          quantity: 1,
          unit_price: 800,
          variant: {
            id: "variant_1",
            title: "Large / Blue",
            product: {
              id: "prod_1",
              title: "Test Product",
              thumbnail: "/test.jpg",
            },
          },
        },
      ],
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("Large / Blue")).toBeInTheDocument()
  })

  it("displays the line-item variant title when the nested variant title is default", () => {
    const cart = createMockCart({
      items: [
        {
          id: "item_1",
          title: "Test Product",
          quantity: 1,
          unit_price: 800,
          variant_title: "Power Tool Green",
          subtitle: "Power Tool Green",
          variant: {
            id: "variant_1",
            title: "Default Variant",
            product: {
              id: "prod_1",
              title: "Test Product",
              thumbnail: "/test.jpg",
            },
          },
        },
      ],
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("Power Tool Green")).toBeInTheDocument()
    expect(screen.queryByText("Standard")).not.toBeInTheDocument()
  })

  it("shows preorder availability messaging", () => {
    const cart = createMockCart({
      items: [
        {
          id: "item_1",
          title: "Test Product",
          quantity: 1,
          unit_price: 800,
          variant: {
            id: "variant_1",
            title: "Default Variant",
            calculated_price: {
              calculated_amount: 800,
              original_amount: 1000,
              currency_code: "usd",
            },
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
        },
      ],
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText(/Pre-order available on/i)).toBeInTheDocument()
    expect(screen.getAllByText("$800.00").length).toBeGreaterThan(0)
    expect(screen.getByText("$1,000.00")).toHaveClass("line-through")
    expect(screen.queryByText(/Pre-order price:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Regular price:/i)).not.toBeInTheDocument()
  })

  it("shows sale pricing with the regular price struck through for non-preorder items", () => {
    const cart = createMockCart({
      items: [
        {
          id: "item_1",
          title: "Sale Product",
          quantity: 1,
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
              title: "Sale Product",
              thumbnail: "/test.jpg",
            },
          },
        },
      ],
      subtotal: 25,
      total: 25,
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getAllByText("$25.00").length).toBeGreaterThan(0)
    expect(screen.getByText("$40.00")).toHaveClass("line-through")
  })

  it("shows bundle metadata regular pricing when variant pricing is not available", () => {
    const cart = createMockCart({
      region: {
        id: "reg_2",
        currency_code: "aud",
        name: "Australia",
      },
      items: [
        {
          id: "item_1",
          title: "Bundle Item",
          quantity: 1,
          unit_price: 41.32,
          metadata: {
            bundle_regular_unit_price: 48.03,
          },
          variant: {
            id: "variant_bundle",
            title: "Default Variant",
            product: {
              id: "prod_1",
              title: "Bundle Item",
              thumbnail: "/test.jpg",
            },
          },
        },
      ],
      subtotal: 41.32,
      total: 41.32,
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getAllByText("A$41.32").length).toBeGreaterThan(0)
    expect(screen.getByText("A$48.03")).toHaveClass("line-through")
  })

  it("groups bundle items in the summary", () => {
    const cart = createMockCart({
      items: [
        {
          id: "item_1",
          title: "Bundle Part 1",
          quantity: 1,
          unit_price: 1000,
          metadata: {
            bundle_id: "bundle_1",
            bundle_title: "Starter Bundle",
            bundle_quantity: 1,
          },
          variant: {
            id: "variant_1",
            title: "Default Variant",
            product: {
              id: "prod_1",
              title: "Bundle Part 1",
              thumbnail: "/1.jpg",
            },
          },
        },
        {
          id: "item_2",
          title: "Bundle Part 2",
          quantity: 1,
          unit_price: 500,
          metadata: {
            bundle_id: "bundle_1",
            bundle_title: "Starter Bundle",
            bundle_quantity: 1,
          },
          variant: {
            id: "variant_2",
            title: "Default Variant",
            product: {
              id: "prod_2",
              title: "Bundle Part 2",
              thumbnail: "/2.jpg",
            },
          },
        },
        {
          id: "item_3",
          title: "Standalone Product",
          quantity: 1,
          unit_price: 250,
          metadata: null,
          variant: {
            id: "variant_3",
            title: "Default Variant",
            product: {
              id: "prod_3",
              title: "Standalone Product",
              thumbnail: "/3.jpg",
            },
          },
        },
      ],
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("Starter Bundle")).toBeInTheDocument()
    expect(screen.getByText("Bundle Part 1")).toBeInTheDocument()
    expect(screen.getByText("Bundle Part 2")).toBeInTheDocument()
    expect(screen.getByText("Standalone Product")).toBeInTheDocument()
  })

  it("shows an order-level preorder notice", () => {
    const cart = createMockCart({
      items: [
        {
          id: "item_1",
          title: "Preorder Product",
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
              title: "Preorder Product",
              thumbnail: "/test.jpg",
            },
          },
        },
      ],
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText(/Pre-order items ship when available/i)).toBeInTheDocument()
  })

  it("shows 'Standard' for default variant", () => {
    const cart = createMockCart()
    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("Standard")).toBeInTheDocument()
  })

  it("formats prices correctly in USD", () => {
    const cart = createMockCart()
    render(<CheckoutSummary cart={cart} />)

    const priceElements = screen.getAllByText(/\$20\.00/)
    expect(priceElements.length).toBeGreaterThan(0)
  })

  it("formats prices correctly in AUD", () => {
    const cart = createMockCart({
      region: {
        id: "reg_2",
        currency_code: "aud",
        name: "Australia",
      },
    })

    render(<CheckoutSummary cart={cart} />)

    const priceElements = screen.getAllByText(/A?\$20\.00/)
    expect(priceElements.length).toBeGreaterThan(0)
  })

  it("displays subtotal", () => {
    const cart = createMockCart()
    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("Subtotal")).toBeInTheDocument()
  })

  it("displays shipping placeholder", () => {
    render(<CheckoutSummary cart={createMockCart()} />)

    expect(screen.getByText("Shipping")).toBeInTheDocument()
    expect(screen.getAllByText("Calculated next")).toHaveLength(2)
  })

  it("displays actual shipping and tax totals once calculated", () => {
    const cart = createMockCart({
      shipping_methods: [{ id: "ship_1" }],
      shipping_total: 12.95,
      tax_total: 3.3,
      total: 36.25,
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("$12.95")).toBeInTheDocument()
    expect(screen.getByText("$3.30")).toBeInTheDocument()
    expect(screen.getByText("$36.25")).toBeInTheDocument()
    expect(screen.queryByText("Calculated next")).not.toBeInTheDocument()
  })

  it("displays the shipping subtotal when Medusa also returns a tax-inclusive shipping total", () => {
    const cart = createMockCart({
      item_subtotal: 19,
      subtotal: 31.05,
      shipping_methods: [{ id: "ship_1" }],
      shipping_subtotal: 12.05,
      shipping_total: 13.255,
      tax_total: 3.105,
      total: 34.155,
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("$19.00")).toBeInTheDocument()
    expect(screen.getByText("$12.05")).toBeInTheDocument()
    expect(screen.getByText("$3.11")).toBeInTheDocument()
    expect(screen.getByText("$34.16")).toBeInTheDocument()
    expect(screen.queryByText("$31.05")).not.toBeInTheDocument()
    expect(screen.queryByText("$13.26")).not.toBeInTheDocument()
  })

  it("keeps shipping and taxes pending when no shipping method is selected", () => {
    const cart = createMockCart({
      shipping_methods: [],
      shipping_total: 0,
      tax_total: 0,
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getAllByText("Calculated next")).toHaveLength(2)
  })

  it("keeps shipping pending but displays tax after address totals are calculated", () => {
    const cart = createMockCart({
      shipping_address: { id: "addr_1" },
      shipping_total: 0,
      tax_total: 2.2,
      total: 24.2,
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("Calculated next")).toBeInTheDocument()
    expect(screen.getByText("$2.20")).toBeInTheDocument()
  })

  it("displays the selected delivery estimate before the shipping method is saved", () => {
    function SetEstimate() {
      const estimate = useCheckoutSummaryEstimate()
      useEffect(() => {
        estimate?.setEstimatedShippingTotal(15.75)
      }, [estimate])
      return null
    }

    render(
      <CheckoutSummaryEstimateProvider>
        <SetEstimate />
        <CheckoutSummary
          cart={createMockCart({
            shipping_address: { id: "addr_1" },
            shipping_methods: [],
            shipping_total: 0,
            tax_total: 0,
          })}
        />
      </CheckoutSummaryEstimateProvider>
    )

    expect(screen.getByText("$15.75")).toBeInTheDocument()
    expect(screen.getByText("$37.75")).toBeInTheDocument()
    expect(screen.queryByText("Calculated next")).not.toBeInTheDocument()
  })

  it("displays taxes placeholder", () => {
    render(<CheckoutSummary cart={createMockCart()} />)

    expect(screen.getByText("Taxes")).toBeInTheDocument()
  })

  it("displays total", () => {
    const cart = createMockCart({ total: 25 })
    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("Total")).toBeInTheDocument()
  })

  it("handles empty cart", () => {
    const cart = createMockCart({
      items: [],
      subtotal: 0,
      total: 0,
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("Order summary")).toBeInTheDocument()
    expect(screen.getAllByText(/\$0\.00/).length).toBeGreaterThan(0)
  })

  it("handles multiple items", () => {
    const cart = createMockCart({
      items: [
        {
          id: "item_1",
          title: "Product 1",
          quantity: 1,
          unit_price: 1000,
          variant: {
            id: "variant_1",
            title: "Default Variant",
            product: { id: "prod_1", title: "Product 1", thumbnail: "/1.jpg" },
          },
        },
        {
          id: "item_2",
          title: "Product 2",
          quantity: 3,
          unit_price: 500,
          variant: {
            id: "variant_2",
            title: "Default Variant",
            product: { id: "prod_2", title: "Product 2", thumbnail: "/2.jpg" },
          },
        },
      ],
    })

    render(<CheckoutSummary cart={cart} />)

    expect(screen.getByText("Product 1")).toBeInTheDocument()
    expect(screen.getByText("Product 2")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })
})
