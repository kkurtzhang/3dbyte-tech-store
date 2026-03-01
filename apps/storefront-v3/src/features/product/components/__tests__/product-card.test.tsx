import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProductCard, type ProductCardProps } from "../product-card"

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

// Mock Next.js Link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

// Mock QuickView components
jest.mock("../quick-view-button", () => ({
  QuickViewButton: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} data-testid="quick-view-btn">
      Quick View
    </button>
  ),
}))

jest.mock("../quick-view-dialog", () => ({
  QuickViewDialog: ({
    handle,
    open,
    onOpenChange,
  }: {
    handle: string
    open: boolean
    onOpenChange: (open: boolean) => void
  }) =>
    open ? (
      <div data-testid="quick-view-dialog">
        <span>{handle}</span>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}))

// Mock lucide-react
jest.mock("lucide-react", () => ({
  Flame: () => <span data-testid="flame-icon">🔥</span>,
}))

const defaultProps: ProductCardProps = {
  id: "prod_1",
  handle: "test-product",
  title: "Test Product",
  thumbnail: "/test-image.jpg",
  price: {
    amount: 29.99,
    currency_code: "aud",
  },
}

describe("ProductCard", () => {
  it("renders product title and link", () => {
    render(<ProductCard {...defaultProps} />)

    // There are two links (image and title) - both should point to the product
    const links = screen.getAllByRole("link", { name: /test product/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute("href", "/products/test-product")
    expect(links[1]).toHaveAttribute("href", "/products/test-product")
  })

  it("renders product thumbnail", () => {
    render(<ProductCard {...defaultProps} />)

    const image = screen.getByRole("img", { name: /test product/i })
    expect(image).toHaveAttribute("src", "/test-image.jpg")
  })

  it("shows placeholder when no thumbnail", () => {
    render(<ProductCard {...defaultProps} thumbnail="" />)

    expect(screen.getByText("NO_IMAGE")).toBeInTheDocument()
  })

  it("formats price correctly", () => {
    render(<ProductCard {...defaultProps} />)

    // Intl.NumberFormat formats AUD as "A$29.99"
    expect(screen.getByText(/29\.99/)).toBeInTheDocument()
  })

  it("shows discount badge when discount is present", () => {
    render(
      <ProductCard {...defaultProps} discountPercentage={20} originalPrice={39.99} />
    )

    expect(screen.getByText(/-20%/)).toBeInTheDocument()
  })

  it("shows flame icon for hot deals (30%+ discount)", () => {
    render(
      <ProductCard {...defaultProps} discountPercentage={35} originalPrice={49.99} />
    )

    expect(screen.getByTestId("flame-icon")).toBeInTheDocument()
  })

  it("does not show flame icon for regular discounts", () => {
    render(
      <ProductCard {...defaultProps} discountPercentage={15} originalPrice={39.99} />
    )

    expect(screen.queryByTestId("flame-icon")).not.toBeInTheDocument()
  })

  it("shows original price with strikethrough when discounted", () => {
    render(
      <ProductCard {...defaultProps} discountPercentage={20} originalPrice={39.99} />
    )

    // Check for strikethrough element
    const strikethrough = document.querySelector(".line-through")
    expect(strikethrough).toBeInTheDocument()
  })

  it("shows spec badge when specs are provided", () => {
    render(
      <ProductCard
        {...defaultProps}
        specs={[
          { label: "Weight", value: "1kg" },
          { label: "Size", value: "Large" },
        ]}
      />
    )

    expect(screen.getByText("1kg")).toBeInTheDocument()
  })

  it("does not show spec badge when no specs", () => {
    render(<ProductCard {...defaultProps} />)

    expect(screen.queryByText("1kg")).not.toBeInTheDocument()
  })

  it("opens quick view dialog on button click", async () => {
    const user = userEvent.setup()

    render(<ProductCard {...defaultProps} />)

    await user.click(screen.getByTestId("quick-view-btn"))

    expect(screen.getByTestId("quick-view-dialog")).toBeInTheDocument()
  })

  it("closes quick view dialog", async () => {
    const user = userEvent.setup()

    render(<ProductCard {...defaultProps} />)

    // Open dialog
    await user.click(screen.getByTestId("quick-view-btn"))
    expect(screen.getByTestId("quick-view-dialog")).toBeInTheDocument()

    // Close dialog
    await user.click(screen.getByText("Close"))
    expect(screen.queryByTestId("quick-view-dialog")).not.toBeInTheDocument()
  })
})
