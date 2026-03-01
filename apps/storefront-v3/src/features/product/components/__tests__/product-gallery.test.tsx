import { render, screen, fireEvent } from "@testing-library/react"
import { ProductGallery } from "../product-gallery"
import type { StoreProduct, StoreProductVariant } from "@medusajs/types"

// Mock Next.js Image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    fill,
    className,
    sizes,
    priority,
  }: {
    src: string
    alt: string
    fill?: boolean
    className?: string
    sizes?: string
    priority?: boolean
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      data-fill={fill}
      data-sizes={sizes}
      data-priority={priority}
      className={className}
    />
  ),
}))

// Mock lucide-react
jest.mock("lucide-react", () => ({
  ChevronLeft: () => <span data-testid="chevron-left">←</span>,
  ChevronRight: () => <span data-testid="chevron-right">→</span>,
}))

// Mock scroll behavior
Object.defineProperty(HTMLElement.prototype, "scrollBy", {
  writable: true,
  value: jest.fn(),
})

const createMockProduct = (images: { id: string; url: string }[] = []): StoreProduct =>
  ({
    id: "prod_1",
    title: "Test Product",
    handle: "test-product",
    images,
  }) as unknown as StoreProduct

const createMockVariant = (id: string): StoreProductVariant =>
  ({
    id,
    title: "Test Variant",
  }) as unknown as StoreProductVariant

describe("ProductGallery", () => {
  it("shows placeholder when no images", () => {
    render(<ProductGallery product={createMockProduct()} />)

    expect(screen.getByText("No images available")).toBeInTheDocument()
  })

  it("renders main product image", () => {
    const product = createMockProduct([
      { id: "img_1", url: "/image1.jpg" },
    ])

    render(<ProductGallery product={product} />)

    const mainImage = screen.getByAltText("Test Product")
    expect(mainImage).toHaveAttribute("src", "/image1.jpg")
  })

  it("renders multiple images with navigation", () => {
    const product = createMockProduct([
      { id: "img_1", url: "/image1.jpg" },
      { id: "img_2", url: "/image2.jpg" },
    ])

    render(<ProductGallery product={product} />)

    // Should have navigation arrows
    expect(screen.getByLabelText("Previous image")).toBeInTheDocument()
    expect(screen.getByLabelText("Next image")).toBeInTheDocument()

    // Should have image counter
    expect(screen.getByText("1 / 2")).toBeInTheDocument()
  })

  it("navigates to next image", () => {
    const product = createMockProduct([
      { id: "img_1", url: "/image1.jpg" },
      { id: "img_2", url: "/image2.jpg" },
    ])

    render(<ProductGallery product={product} />)

    const nextButton = screen.getByLabelText("Next image")
    fireEvent.click(nextButton)

    // Counter should update
    expect(screen.getByText("2 / 2")).toBeInTheDocument()
  })

  it("navigates to previous image", () => {
    const product = createMockProduct([
      { id: "img_1", url: "/image1.jpg" },
      { id: "img_2", url: "/image2.jpg" },
    ])

    render(<ProductGallery product={product} />)

    // Go to second image first
    fireEvent.click(screen.getByLabelText("Next image"))
    expect(screen.getByText("2 / 2")).toBeInTheDocument()

    // Go back to first
    fireEvent.click(screen.getByLabelText("Previous image"))
    expect(screen.getByText("1 / 2")).toBeInTheDocument()
  })

  it("disables previous button on first image", () => {
    const product = createMockProduct([
      { id: "img_1", url: "/image1.jpg" },
      { id: "img_2", url: "/image2.jpg" },
    ])

    render(<ProductGallery product={product} />)

    const prevButton = screen.getByLabelText("Previous image")
    expect(prevButton).toBeDisabled()
  })

  it("disables next button on last image", () => {
    const product = createMockProduct([
      { id: "img_1", url: "/image1.jpg" },
      { id: "img_2", url: "/image2.jpg" },
    ])

    render(<ProductGallery product={product} />)

    // Go to last image
    fireEvent.click(screen.getByLabelText("Next image"))

    const nextButton = screen.getByLabelText("Next image")
    expect(nextButton).toBeDisabled()
  })

  it("renders thumbnails for multiple images", () => {
    const product = createMockProduct([
      { id: "img_1", url: "/image1.jpg" },
      { id: "img_2", url: "/image2.jpg" },
    ])

    render(<ProductGallery product={product} />)

    const thumbnails = screen.getAllByLabelText(/view image/i)
    expect(thumbnails).toHaveLength(2)
  })

  it("clicking thumbnail changes main image", () => {
    const product = createMockProduct([
      { id: "img_1", url: "/image1.jpg" },
      { id: "img_2", url: "/image2.jpg" },
    ])

    render(<ProductGallery product={product} />)

    // Click second thumbnail
    const thumbnails = screen.getAllByLabelText(/view image/i)
    fireEvent.click(thumbnails[1])

    // Counter should update
    expect(screen.getByText("2 / 2")).toBeInTheDocument()
  })

  it("parses variant image URLs from JSON strings", () => {
    const product = createMockProduct([
      { id: "img_1", url: "/image1.jpg" },
    ])

    const variantImageUrls = [
      JSON.stringify({ id: "vimg_1", url: "/variant-image.jpg", variantId: "var_1" }),
    ]

    render(
      <ProductGallery product={product} variantImageUrls={variantImageUrls} />
    )

    // Should have 2 images now (product + variant)
    expect(screen.getByText("1 / 2")).toBeInTheDocument()
  })

  it("shows single image without navigation", () => {
    const product = createMockProduct([
      { id: "img_1", url: "/image1.jpg" },
    ])

    render(<ProductGallery product={product} />)

    // No navigation arrows for single image
    expect(screen.queryByLabelText("Previous image")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Next image")).not.toBeInTheDocument()

    // No counter for single image
    expect(screen.queryByText(/\/ 1/)).not.toBeInTheDocument()
  })

  it("highlights variant image when variant is selected", () => {
    const product = createMockProduct([
      { id: "img_1", url: "/image1.jpg" },
    ])

    const variantImageUrls = [
      JSON.stringify({ id: "vimg_1", url: "/variant-image.jpg", variantId: "var_1" }),
    ]

    const selectedVariant = createMockVariant("var_1")

    render(
      <ProductGallery
        product={product}
        variantImageUrls={variantImageUrls}
        selectedVariant={selectedVariant}
      />
    )

    // Should show variant badge
    expect(screen.getByText("Test")).toBeInTheDocument()
  })
})
