import { render, screen } from "@testing-library/react"

import BundlesPage, { generateMetadata } from "../page"

import { getPricingContext } from "@/lib/medusa/regions.server"
import type { MedusaProduct } from "@/lib/medusa/types"
import { getBundleLink, getBundleProductsById } from "@/lib/medusa/bundles"
import { getProductBundles } from "@/lib/medusa/products"

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}))

jest.mock("lucide-react", () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "__esModule") return true
        return (props: Record<string, unknown>) => <svg {...props} />
      },
    }
  )
)

jest.mock("@/components/layout/listing-layout", () => ({
  ListingLayout: ({
    children,
    header,
  }: {
    children: React.ReactNode
    header: React.ReactNode
  }) => (
    <main>
      <header>{header}</header>
      {children}
    </main>
  ),
}))

jest.mock("@/components/layout/listing-pagination", () => ({
  ListingPagination: () => <nav aria-label="Bundle pagination" />,
}))

jest.mock("@/components/ui/button", () => ({
  Button: ({ asChild, children, ...props }: Record<string, unknown>) =>
    asChild ? (
      <>{children as React.ReactNode}</>
    ) : (
      <button {...props}>{children as React.ReactNode}</button>
    ),
}))

jest.mock("@/lib/medusa/regions.server", () => ({
  getPricingContext: jest.fn(),
}))

jest.mock("@/lib/medusa/bundles", () => ({
  getBundleLink: jest.fn(),
  getBundleProductsById: jest.fn(),
  getProductPath: jest.fn((handle: string) => `/bundles/${handle}`),
}))

jest.mock("@/lib/medusa/products", () => ({
  getProductBundles: jest.fn(),
}))

const mockGetPricingContext = getPricingContext as jest.MockedFunction<
  typeof getPricingContext
>
const mockGetBundleProductsById = getBundleProductsById as jest.MockedFunction<
  typeof getBundleProductsById
>
const mockGetBundleLink = getBundleLink as jest.MockedFunction<
  typeof getBundleLink
>
const mockGetProductBundles = getProductBundles as jest.MockedFunction<
  typeof getProductBundles
>

describe("Bundles page", () => {
  beforeEach(() => {
    mockGetPricingContext.mockResolvedValue({
      region_id: "reg_au",
      country_code: "au",
      currency_code: "aud",
    })
    mockGetProductBundles.mockResolvedValue({
      products: [],
      count: 0,
    })
    mockGetBundleProductsById.mockResolvedValue({})
    mockGetBundleLink.mockReturnValue(null)
  })

  it("uses customer-facing copy and theme-safe contrast classes", async () => {
    render(await BundlesPage({ searchParams: Promise.resolve({}) }))

    const heroContent = screen.getByText("Curated Kits").parentElement
    const heroPanel = heroContent?.parentElement
    const heroDescription = screen.getByText(
      /Save time with matched parts, accessories, and filament/i
    )
    const emptyState = screen.getByText("Bundles are coming soon").parentElement

    expect(heroPanel).toHaveClass("bg-card")
    expect(heroPanel).toHaveClass("text-card-foreground")
    expect(heroPanel?.className).not.toContain("text-white")
    expect(heroDescription).toHaveClass("text-muted-foreground")
    expect(heroDescription.className).not.toContain("text-primary-foreground")

    expect(emptyState).toHaveClass("bg-muted/30")
    expect(emptyState).toHaveClass("border-border")
    expect(emptyState?.className).not.toContain("bg-slate")
    expect(screen.queryByText(/Medusa|backend|grouped cart/i)).not.toBeInTheDocument()
  })

  it("uses customer-facing fallback copy on bundle cards", async () => {
    mockGetProductBundles.mockResolvedValue({
      products: [
        {
          id: "prod_bundle",
          title: "Printer Starter Kit",
          handle: "printer-starter-kit",
          description: null,
          variants: [
            {
              calculated_price: {
                calculated_amount: 24900,
                currency_code: "aud",
              },
            },
          ],
        } as unknown as MedusaProduct,
      ],
      count: 1,
    })

    render(await BundlesPage({ searchParams: Promise.resolve({}) }))

    expect(
      screen.getByText("Matched products selected to work together.")
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/backend|route|grouped add-to-cart/i)
    ).not.toBeInTheDocument()
  })

  it("uses customer-facing metadata", async () => {
    const metadata = await generateMetadata()

    expect(metadata.title).toBe("Product Bundles")
    expect(metadata.description).toBe(
      "Shop curated 3D printing bundles with matched parts, accessories, and filament selected to work together."
    )
    expect(metadata.description).not.toMatch(/Medusa|grouped cart|variant/i)
  })
})
