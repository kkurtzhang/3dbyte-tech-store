import { render, screen } from "@testing-library/react"

import BundlesPage from "../page"

import { getPricingContext } from "@/lib/medusa/regions.server"
import { getBundleProductsById } from "@/lib/medusa/bundles"
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
  })

  it("uses theme-safe contrast classes on the bundle hero and empty state", async () => {
    render(await BundlesPage({ searchParams: Promise.resolve({}) }))

    const heroContent = screen.getByText("Real Bundle Inventory").parentElement
    const heroPanel = heroContent?.parentElement
    const heroDescription = screen.getByText(
      /Each bundle is linked to a real Medusa product/i
    )
    const emptyState = screen.getByText("No bundles available yet").parentElement

    expect(heroPanel).toHaveClass("bg-card")
    expect(heroPanel).toHaveClass("text-card-foreground")
    expect(heroPanel?.className).not.toContain("text-white")
    expect(heroDescription).toHaveClass("text-muted-foreground")
    expect(heroDescription.className).not.toContain("text-primary-foreground")

    expect(emptyState).toHaveClass("bg-muted/30")
    expect(emptyState).toHaveClass("border-border")
    expect(emptyState?.className).not.toContain("bg-slate")
  })
})
