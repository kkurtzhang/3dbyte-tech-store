import { render, screen } from "@testing-library/react"

import SearchPage, { generateMetadata } from "../page"

import { getPricingContext } from "@/lib/medusa/regions.server"
import { searchProducts } from "@/lib/search/products"

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

jest.mock("@/features/search/components/search-input", () => ({
  SearchInput: () => <input aria-label="Search products" />,
}))

jest.mock("@/components/filters", () => ({
  SearchFilters: () => <div>Search filters</div>,
}))

jest.mock("@/features/shop/components/shop-sort", () => ({
  ShopSort: () => <div>Sort</div>,
}))

jest.mock("@/features/search/components/search-results", () => ({
  SearchResults: ({ initialHits }: { initialHits: unknown[] }) => (
    <pre data-testid="initial-hits">{JSON.stringify(initialHits)}</pre>
  ),
}))

jest.mock("@/lib/medusa/regions.server", () => ({
  getPricingContext: jest.fn(),
}))

jest.mock("@/lib/search/products", () => ({
  searchProducts: jest.fn(),
}))

const mockGetPricingContext = getPricingContext as jest.MockedFunction<
  typeof getPricingContext
>
const mockSearchProducts = searchProducts as jest.MockedFunction<typeof searchProducts>

describe("SearchPage", () => {
  beforeEach(() => {
    mockGetPricingContext.mockResolvedValue({
      region_id: "reg_au",
      currency_code: "aud",
    })
    mockSearchProducts.mockResolvedValue({
      products: [
        {
          id: "prod_1",
          handle: "filament",
          title: "Filament",
          thumbnail: "",
          price: 31.95,
          currency_code: "aud",
          price_aud: 31.95,
          on_sale: false,
          in_stock: false,
          inventory_quantity: 0,
          category_ids: ["cat_filament"],
          categories: ["Filament"],
          variants: [],
        },
      ],
      totalCount: 1,
      facets: {},
      error: false,
    })
  })

  it("passes indexed availability through to search result cards", async () => {
    render(
      await SearchPage({
        searchParams: Promise.resolve({ q: "filament" }),
      })
    )

    const hits = JSON.parse(screen.getByTestId("initial-hits").textContent ?? "[]")

    expect(hits[0]).toEqual(
      expect.objectContaining({
        in_stock: false,
        inventory_quantity: 0,
      })
    )
  })

  it("uses the search term in page metadata", async () => {
    await expect(
      generateMetadata({
        searchParams: Promise.resolve({ q: "petg filament" }),
      })
    ).resolves.toEqual(
      expect.objectContaining({
        title: 'Search results for "petg filament"',
        description: expect.stringContaining("petg filament"),
      })
    )
  })

  it("uses browse metadata when no query is present", async () => {
    await expect(
      generateMetadata({
        searchParams: Promise.resolve({}),
      })
    ).resolves.toEqual(
      expect.objectContaining({
        title: "Search products",
      })
    )
  })
})
