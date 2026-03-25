import { render } from "@testing-library/react"
import { ShopFilters } from "../shop-filters"
import { SearchFilters } from "../search-filters"
import type { FilterFacets } from "@/features/shop/types/filters"

const pushMock = jest.fn()

let mockFacets: FilterFacets | null = null

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () =>
    new URLSearchParams("inStock=true"),
}))

jest.mock("../hooks/use-filter-facets", () => ({
  useFilterFacets: () => ({
    facets: mockFacets,
    isLoading: false,
    error: null,
  }),
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
  FilterSidebar: () => <div data-testid="filter-sidebar" />,
}))

const FACETS_FIXTURE: FilterFacets = {
  categories: [],
  brands: [],
  collections: [],
  onSale: [],
  inStock: [{ value: "true", count: 10 }],
  priceRange: { min: 5, max: 100 },
  options: {},
}

describe("filter wrappers", () => {
  beforeEach(() => {
    mockFacets = null
    pushMock.mockReset()
  })

  it("rerenders ShopFilters cleanly when facets load", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    const { rerender } = render(<ShopFilters />)

    mockFacets = FACETS_FIXTURE

    expect(() => {
      rerender(<ShopFilters />)
    }).not.toThrow()

    consoleErrorSpy.mockRestore()
  })

  it("rerenders SearchFilters cleanly when facets load", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    const { rerender } = render(<SearchFilters searchQuery="nozzle" />)

    mockFacets = FACETS_FIXTURE

    expect(() => {
      rerender(<SearchFilters searchQuery="nozzle" />)
    }).not.toThrow()

    consoleErrorSpy.mockRestore()
  })
})
