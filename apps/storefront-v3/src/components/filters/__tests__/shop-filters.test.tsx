import { fireEvent, render, screen } from "@testing-library/react"
import { ShopFilters } from "../shop-filters"
import { SearchFilters } from "../search-filters"
import type { FilterFacets } from "@/features/shop/types/filters"
import type { FilterSidebarProps } from "../filter-sidebar"

const pushMock = jest.fn()
const filterSidebarMock = jest.fn()
const mockUseFilterFacets = jest.fn()

let mockFacets: FilterFacets | null = null
let mockSearchParams = new URLSearchParams("inStock=true")

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => mockSearchParams,
}))

jest.mock("../hooks/use-filter-facets", () => ({
  useFilterFacets: (options: unknown) => mockUseFilterFacets(options),
}))

jest.mock("../hooks/use-facet-labels", () => ({
  useFacetLabels: () => ({
    labels: {
      categories: {},
      brands: {},
      collections: {},
    },
    isLoading: false,
  }),
}))

jest.mock("../filter-sidebar", () => ({
  FilterSidebar: (props: FilterSidebarProps) => {
    filterSidebarMock(props)

    return (
      <div
        data-testid="filter-sidebar"
        data-in-stock={String(props.selectedInStock)}
      >
        <a href={props.clearAllUrl}>Clear filters</a>
        <button type="button" onClick={() => props.onInStockChange?.(false)}>
          Disable stock filter
        </button>
      </div>
    )
  },
}))

const FACETS_FIXTURE: FilterFacets = {
  categories: [],
  brands: [],
  collections: [],
  bundles: [],
  onSale: [],
  inStock: [{ value: "true", count: 10 }],
  priceRange: { min: 5, max: 100 },
  options: {},
}

describe("filter wrappers", () => {
  beforeEach(() => {
    mockFacets = null
    mockSearchParams = new URLSearchParams("inStock=true")
    pushMock.mockReset()
    filterSidebarMock.mockReset()
    mockUseFilterFacets.mockReset()
    mockUseFilterFacets.mockImplementation(() => ({
      facets: mockFacets,
      isLoading: false,
      error: null,
    }))
  })

  it("rerenders ShopFilters cleanly when facets load", () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {})

    const { rerender } = render(<ShopFilters />)

    mockFacets = FACETS_FIXTURE

    expect(() => {
      rerender(<ShopFilters />)
    }).not.toThrow()

    consoleErrorSpy.mockRestore()
  })

  it("rerenders SearchFilters cleanly when facets load", () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {})

    const { rerender } = render(<SearchFilters searchQuery="nozzle" />)

    mockFacets = FACETS_FIXTURE

    expect(() => {
      rerender(<SearchFilters searchQuery="nozzle" />)
    }).not.toThrow()

    consoleErrorSpy.mockRestore()
  })

  it("keeps the shop in-stock filter enabled by default without requiring an inStock URL param", () => {
    mockSearchParams = new URLSearchParams("")
    mockFacets = FACETS_FIXTURE

    render(<ShopFilters />)

    expect(screen.getByTestId("filter-sidebar")).toHaveAttribute(
      "data-in-stock",
      "true",
    )
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/shop",
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Disable stock filter" }),
    )

    expect(pushMock).toHaveBeenCalledWith("/shop?inStock=false")
  })

  it("fetches search facets with the active search filters applied", () => {
    mockSearchParams = new URLSearchParams(
      "category=cat_filament&brand=brand_polymaker&collection=col_premium&bundle=true&onSale=true&minPrice=30&maxPrice=80&options_colour=Black,White",
    )
    mockFacets = FACETS_FIXTURE

    render(<SearchFilters searchQuery="petg" />)

    expect(mockUseFilterFacets).toHaveBeenCalledWith({
      query: "petg",
      filterOverrides: expect.arrayContaining([
        'category_ids IN ["cat_filament"]',
        'brand.id IN ["brand_polymaker"]',
        'collection_ids IN ["col_premium"]',
        "is_bundle = true",
        "on_sale = true",
        "in_stock = true",
        "price_aud >= 30",
        "price_aud <= 80",
        'options_colour IN ["Black", "White"]',
      ]),
    })
  })

  it("keeps the search price slider bounds stable after applying a price filter", () => {
    const fullPriceFacets: FilterFacets = {
      ...FACETS_FIXTURE,
      priceRange: { min: 5, max: 100 },
    }
    const filteredPriceFacets: FilterFacets = {
      ...FACETS_FIXTURE,
      priceRange: { min: 30, max: 80 },
    }

    mockSearchParams = new URLSearchParams("minPrice=30&maxPrice=80")
    mockUseFilterFacets.mockImplementation(
      (options: { filterOverrides?: string[] }) => ({
        facets: options.filterOverrides?.some((filter) =>
          filter.startsWith("price_aud"),
        )
          ? filteredPriceFacets
          : fullPriceFacets,
        isLoading: false,
        error: null,
      }),
    )

    render(<SearchFilters searchQuery="petg" />)

    expect(mockUseFilterFacets).toHaveBeenCalledWith({
      query: "petg",
      filterOverrides: expect.arrayContaining([
        "in_stock = true",
        "price_aud >= 30",
        "price_aud <= 80",
      ]),
    })
    expect(mockUseFilterFacets).toHaveBeenCalledWith({
      query: "petg",
      filterOverrides: ["in_stock = true"],
    })
    expect(filterSidebarMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        facets: expect.objectContaining({
          priceRange: { min: 5, max: 100 },
        }),
        priceRange: { min: 30, max: 80 },
      }),
    )
  })
})
