import { render, screen } from "@testing-library/react"
import { CheckoutSummary } from "../checkout-summary"
import type { StoreCart } from "@medusajs/types"

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
    <img
      src={src}
      alt={alt}
      data-fill={fill}
      data-sizes={sizes}
      className={className}
    />
  ),
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
        unit_price: 1000, // 1000 cents = $10.00
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
    subtotal: 2000, // 2000 cents = $20.00
    total: 2200,
    ...overrides,
  }) as unknown as StoreCart

describe("CheckoutSummary", () => {
  it("renders order manifest header", () => {
    render(<CheckoutSummary cart={createMockCart()} />)

    expect(screen.getByText("Order_Manifest")).toBeInTheDocument()
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

    expect(screen.getByText("NO_IMG")).toBeInTheDocument()
  })

  it("displays variant title when not default", () => {
    const cart = createMockCart({
      items: [
        {
          id: "item_1",
          title: "Test Product",
          quantity: 1,
          unit_price: 1000,
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

  it("displays taxes placeholder", () => {
    render(<CheckoutSummary cart={createMockCart()} />)

    expect(screen.getByText("Taxes")).toBeInTheDocument()
  })

  it("displays total", () => {
    const cart = createMockCart({ total: 2500 }) // 2500 cents = $25.00
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

    expect(screen.getByText("Order_Manifest")).toBeInTheDocument()
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
