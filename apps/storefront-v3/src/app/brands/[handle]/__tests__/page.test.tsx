import { render, screen } from "@testing-library/react"

import BrandPage from "../page"
import { getPricingContext } from "@/lib/medusa/regions.server"
import { getBrandByHandle } from "@/lib/search/brands"
import { searchProducts } from "@/lib/search/products"
import { getBrandDescriptionByHandle } from "@/lib/strapi/content"

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
      <div>{header}</div>
      <aside>{sidebar}</aside>
      {children}
    </main>
  ),
}))

jest.mock("@/features/shop/components/product-grid", () => ({
  ProductGrid: () => <div data-testid="product-grid" />,
}))

jest.mock("@/features/shop/components/shop-sort", () => ({
  ShopSort: () => <div>Sort</div>,
}))

jest.mock("@/features/shop/components/shop-error-state", () => ({
  ShopErrorState: () => <div>Error</div>,
}))

jest.mock("@/features/shop/components/shop-empty-state", () => ({
  ShopEmptyState: () => <div>Empty</div>,
}))

jest.mock("@/components/filters/brand-filters", () => ({
  BrandFilters: () => <div>Brand filters</div>,
}))

jest.mock("@/lib/medusa/regions.server", () => ({
  getPricingContext: jest.fn(),
}))

jest.mock("@/lib/search/brands", () => ({
  getBrandByHandle: jest.fn(),
}))

jest.mock("@/lib/search/products", () => ({
  searchProducts: jest.fn(),
}))

jest.mock("@/lib/strapi/content", () => ({
  getBrandDescriptionByHandle: jest.fn(),
}))

const mockGetPricingContext = getPricingContext as jest.MockedFunction<
  typeof getPricingContext
>
const mockGetBrandByHandle = getBrandByHandle as jest.MockedFunction<
  typeof getBrandByHandle
>
const mockSearchProducts = searchProducts as jest.MockedFunction<typeof searchProducts>
const mockGetBrandDescriptionByHandle =
  getBrandDescriptionByHandle as jest.MockedFunction<
    typeof getBrandDescriptionByHandle
  >

describe("BrandPage", () => {
  beforeEach(() => {
    mockGetPricingContext.mockResolvedValue({
      region_id: "reg_au",
      currency_code: "aud",
    })
    mockGetBrandByHandle.mockResolvedValue({
      id: "brand_polymaker",
      name: "Polymaker",
      handle: "polymaker",
      description: "Filaments",
      product_count: 1,
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    })
    mockSearchProducts.mockResolvedValue({
      products: [
        {
          id: "prod_1",
          handle: "petg-black",
          title: "PETG Black",
          thumbnail: "",
          price: 31.95,
          currency_code: "aud",
          price_aud: 31.95,
          on_sale: false,
          in_stock: true,
          inventory_quantity: 10,
          category_ids: [],
          categories: [],
          variants: [],
        },
      ],
      totalCount: 1,
      facets: {},
      error: false,
    })
  })

  it("renders the CMS brand logo in the brand header", async () => {
    mockGetBrandDescriptionByHandle.mockResolvedValue({
      id: 1,
      medusa_brand_id: "brand_polymaker",
      brand_name: "Polymaker",
      brand_handle: "polymaker",
      seo_description: "Engineered filament for reliable prints.",
      brand_logo: {
        id: 10,
        url: "/uploads/polymaker-logo.png",
        alternativeText: "Polymaker logo",
        width: 320,
        height: 120,
      },
    })

    render(
      await BrandPage({
        params: Promise.resolve({ handle: "polymaker" }),
        searchParams: Promise.resolve({}),
      })
    )

    expect(screen.getByRole("img", { name: "Polymaker logo" })).toHaveAttribute(
      "src",
      "http://localhost:1337/uploads/polymaker-logo.png"
    )
  })
})
