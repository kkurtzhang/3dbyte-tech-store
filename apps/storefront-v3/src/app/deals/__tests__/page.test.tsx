import { render, screen } from "@testing-library/react"

import DealsPage from "../page"

import { getActiveCampaigns } from "@/lib/medusa/campaigns"
import { getPricingContext } from "@/lib/medusa/regions.server"
import { searchProducts } from "@/lib/search/products"
import { getCampaignPlacements } from "@/lib/strapi/content"

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
    sidebar,
  }: {
    children: React.ReactNode
    header: React.ReactNode
    sidebar: React.ReactNode
  }) => (
    <main>
      <header>{header}</header>
      <aside>{sidebar}</aside>
      {children}
    </main>
  ),
}))

jest.mock("@/components/layout/listing-pagination", () => ({
  ListingPagination: () => <nav aria-label="pagination" />,
}))

jest.mock("@/components/ui/button", () => ({
  Button: ({ asChild, children, ...props }: Record<string, unknown>) =>
    asChild ? (
      <>{children as React.ReactNode}</>
    ) : (
      <button {...props}>{children as React.ReactNode}</button>
    ),
}))

jest.mock("@/features/shop/components/product-grid", () => ({
  ProductGrid: ({ products }: { products: Array<{ title: string }> }) => (
    <div>
      {products.map((product) => (
        <article key={product.title}>{product.title}</article>
      ))}
    </div>
  ),
}))

jest.mock("@/features/shop/components/deals-filter", () => ({
  DealsFilter: ({ filters }: { filters: Array<{ label: string; count: number }> }) => (
    <div>
      {filters.map((filter) => (
        <span key={filter.label}>
          {filter.label}: {filter.count}
        </span>
      ))}
    </div>
  ),
}))

jest.mock("@/features/shop/components/shop-error-state", () => ({
  ShopErrorState: () => <div>Unable to load deals</div>,
}))

jest.mock("@/features/shop/components/shop-empty-state", () => ({
  ShopEmptyState: () => <div>No deals found</div>,
}))

jest.mock("@/lib/medusa/campaigns", () => ({
  getActiveCampaigns: jest.fn(),
}))

jest.mock("@/lib/medusa/regions.server", () => ({
  getPricingContext: jest.fn(),
}))

jest.mock("@/lib/search/products", () => ({
  searchProducts: jest.fn(),
}))

jest.mock("@/lib/strapi/content", () => ({
  getCampaignPlacements: jest.fn(),
}))

const mockGetActiveCampaigns = getActiveCampaigns as jest.MockedFunction<
  typeof getActiveCampaigns
>
const mockGetPricingContext = getPricingContext as jest.MockedFunction<typeof getPricingContext>
const mockSearchProducts = searchProducts as jest.MockedFunction<typeof searchProducts>
const mockGetCampaignPlacements = getCampaignPlacements as jest.MockedFunction<
  typeof getCampaignPlacements
>

describe("Deals page", () => {
  beforeEach(() => {
    mockGetActiveCampaigns.mockReset()
    mockGetPricingContext.mockReset()
    mockSearchProducts.mockReset()
    mockGetCampaignPlacements.mockReset()

    mockGetPricingContext.mockResolvedValue({
      region_id: "reg_au",
      currency_code: "aud",
    })
    mockSearchProducts.mockResolvedValue({
      products: [
        {
          id: "prod_1",
          handle: "petg",
          title: "PETG Black",
          thumbnail: "",
          variants: [],
          price: 18,
          currency_code: "aud",
          original_price: 24,
          discount_percentage: 25,
          on_sale: true,
          in_stock: true,
          inventory_quantity: 4,
          price_aud: 18,
          original_price_aud: 24,
          category_ids: [],
          categories: [],
        },
      ],
      totalCount: 1,
      facets: {},
      error: false,
    })
    mockGetActiveCampaigns.mockResolvedValue([
      {
        id: "camp_1",
        name: "Winter PETG Sale",
        campaign_identifier: "winter-petg-sale",
        description: "Medusa campaign fallback",
        promotions: [{ id: "promo_1", code: "PETG10" }],
      },
    ])
    mockGetCampaignPlacements.mockResolvedValue({
      data: [
        {
          id: 1,
          CampaignIdentifier: "winter-petg-sale",
          Enabled: true,
          Priority: 20,
          Eyebrow: "Campaign",
          Headline: "PETG workshop sale",
          Text: "Save on everyday PETG.",
          BadgeText: "PETG10",
          CTA: { id: 1, BtnText: "Shop PETG deals", BtnLink: "/deals" },
          Theme: "sale",
        },
      ],
      meta: {},
    })
  })

  it("renders active campaign merchandising instead of hardcoded sale copy", async () => {
    render(await DealsPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByRole("heading", { name: "PETG workshop sale" })).toBeInTheDocument()
    expect(screen.getByText("Save on everyday PETG.")).toBeInTheDocument()
    expect(screen.getByText("PETG10")).toBeInTheDocument()
    expect(screen.getByText("PETG Black")).toBeInTheDocument()
    expect(screen.queryByText("Mega Sale!")).not.toBeInTheDocument()
  })

  it("keeps campaign merchandising visible when no sale products are indexed", async () => {
    mockSearchProducts.mockResolvedValueOnce({
      products: [],
      totalCount: 0,
      facets: {},
      error: false,
    })

    render(await DealsPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByRole("heading", { name: "PETG workshop sale" })).toBeInTheDocument()
    expect(screen.getByText("Save on everyday PETG.")).toBeInTheDocument()
    expect(screen.getByText("No deals found")).toBeInTheDocument()
  })

  it("uses actual discount counts without heuristic fallbacks", async () => {
    render(await DealsPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByText("10%+ Off: 1")).toBeInTheDocument()
    expect(screen.getByText("20%+ Off: 1")).toBeInTheDocument()
    expect(screen.getByText("30%+ Off: 0")).toBeInTheDocument()
    expect(screen.getByText("40%+ Off: 0")).toBeInTheDocument()
    expect(screen.getByText("50%+ Off: 0")).toBeInTheDocument()
  })
})
