import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FilterSidebar } from "../filter-sidebar"
import type { FilterFacets } from "@/features/shop/types/filters"

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

// Mock Accordion to avoid Radix complexity in tests
jest.mock("@/components/ui/accordion", () => ({
  Accordion: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string[] }) => (
    <div data-testid="accordion" data-default-value={defaultValue?.join(",")}>
      {children}
    </div>
  ),
  AccordionItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`accordion-item-${value}`}>{children}</div>
  ),
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="accordion-content">{children}</div>
  ),
}))

// Mock child components
jest.mock("../filter-section", () => ({
  FilterSection: ({ children, title, value }: { children: React.ReactNode; title: React.ReactNode; value: string }) => (
    <div data-testid={`filter-section-${value}`}>
      <span data-testid={`section-title-${value}`}>{title}</span>
      {children}
    </div>
  ),
}))

jest.mock("../toggle-filter", () => ({
  ToggleFilter: ({ label, checked, onChange, count }: { label: string; checked: boolean; onChange: (checked: boolean) => void; count?: number }) => (
    <div data-testid="toggle-filter" data-label={label}>
      <span>{label}</span>
      <span data-testid="checked-state">{checked ? "checked" : "unchecked"}</span>
      {count !== undefined && <span data-testid="count">{count}</span>}
      <button type="button" onClick={() => onChange(!checked)} data-testid={`toggle-btn-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        Toggle
      </button>
    </div>
  ),
}))

jest.mock("../price-range-slider", () => ({
  PriceRangeSlider: ({ currentMin, currentMax, onApply, onClear }: { currentMin: number; currentMax: number; onApply: (min: number, max: number) => void; onClear: () => void }) => (
    <div data-testid="price-range-slider">
      <span data-testid="current-min">{currentMin}</span>
      <span data-testid="current-max">{currentMax}</span>
      <button type="button" onClick={() => onApply(currentMin, currentMax)}>
        Apply
      </button>
      <button type="button" onClick={onClear}>
        Clear
      </button>
    </div>
  ),
}))

jest.mock("../facet-options-section", () => ({
  FacetOptionsSection: ({ title, value, options, selectedValues, onChange, onClear, selectedCount }: { title: string; value: string; options: Array<{ value: string; count: number }>; selectedValues: string[]; onChange: (value: string, checked: boolean) => void; onClear?: () => void; selectedCount?: number }) => (
    <div data-testid={`facet-options-${value}`}>
      <span>{title}</span>
      {selectedCount !== undefined && <span data-testid="selected-count">{selectedCount}</span>}
      {options.map((opt) => (
        <div key={opt.value} data-testid={`option-${value}-${opt.value}`}>
          <span>{opt.value}</span>
          <span>{opt.count}</span>
          <input
            type="checkbox"
            checked={selectedValues.includes(opt.value)}
            onChange={(e) => onChange(opt.value, e.target.checked)}
            data-testid={`checkbox-${value}-${opt.value}`}
          />
        </div>
      ))}
      {onClear && (
        <button type="button" onClick={onClear} data-testid={`clear-${value}`}>
          Clear
        </button>
      )}
    </div>
  ),
}))

jest.mock("../active-filter-chips", () => ({
  ActiveFilterChips: ({ onRemoveFilter }: { onRemoveFilter: (type: string, value?: string) => void }) => (
    <div data-testid="active-filter-chips">
      <button type="button" onClick={() => onRemoveFilter("category", "cat1")} data-testid="remove-category">
        Remove Category
      </button>
      <button type="button" onClick={() => onRemoveFilter("brand", "brand1")} data-testid="remove-brand">
        Remove Brand
      </button>
    </div>
  ),
}))

// Sample facets data factory
function createMockFacets(overrides: Partial<FilterFacets> = {}): FilterFacets {
  return {
    categories: [
      { value: "cat1", label: "Category 1", count: 10 },
      { value: "cat2", label: "Category 2", count: 5 },
    ],
    brands: [
      { value: "brand1", label: "Brand 1", count: 8 },
      { value: "brand2", label: "Brand 2", count: 3 },
    ],
    collections: [
      { value: "col1", label: "Collection 1", count: 12 },
    ],
    onSale: [
      { value: "true", count: 7 },
      { value: "false", count: 13 },
    ],
    inStock: [
      { value: "true", count: 15 },
      { value: "false", count: 5 },
    ],
    priceRange: { min: 0, max: 1000 },
    options: {
      options_colour: [
        { value: "red", count: 5 },
        { value: "blue", count: 3 },
      ],
    },
    ...overrides,
  }
}

describe("FilterSidebar", () => {
  const user = userEvent.setup()

  // Default handlers for testing
  const mockHandlers = {
    onCategoryChange: jest.fn(),
    onBrandChange: jest.fn(),
    onCollectionChange: jest.fn(),
    onSaleChange: jest.fn(),
    onInStockChange: jest.fn(),
    onPriceChange: jest.fn(),
    onOptionChange: jest.fn(),
    onSelectAllCategories: jest.fn(),
    onClearCategories: jest.fn(),
    onSelectAllBrands: jest.fn(),
    onClearBrands: jest.fn(),
    onSelectAllCollections: jest.fn(),
    onClearCollections: jest.fn(),
    onClearOption: jest.fn(),
    onRemoveFilter: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders loading state when facets is null", () => {
      render(<FilterSidebar facets={null} />)

      expect(screen.getByText("Filters")).toBeInTheDocument()
      expect(screen.getByText("Loading filters...")).toBeInTheDocument()
    })

    it("renders filter sections when facets are provided", () => {
      const facets = createMockFacets()
      render(<FilterSidebar facets={facets} />)

      expect(screen.getByText("Filters")).toBeInTheDocument()
      expect(screen.getByTestId("filter-section-inStock")).toBeInTheDocument()
      expect(screen.getByTestId("filter-section-price")).toBeInTheDocument()
      expect(screen.getByTestId("facet-options-categories")).toBeInTheDocument()
      expect(screen.getByTestId("facet-options-brands")).toBeInTheDocument()
      expect(screen.getByTestId("facet-options-collections")).toBeInTheDocument()
      expect(screen.getByTestId("filter-section-onSale")).toBeInTheDocument()
    })

    it("renders with custom className", () => {
      const facets = createMockFacets()
      const { container } = render(
        <FilterSidebar facets={facets} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  describe("clearAllUrl functionality", () => {
    it("shows Clear All link when filters are active and clearAllUrl is provided", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar
          facets={facets}
          clearAllUrl="/shop"
          selectedCategories={["cat1"]}
        />
      )

      const clearAllLink = screen.getByText("Clear All")
      expect(clearAllLink).toBeInTheDocument()
      expect(clearAllLink.closest("a")).toHaveAttribute("href", "/shop")
    })

    it("does not show Clear All link when no filters are active", () => {
      const facets = createMockFacets()
      render(<FilterSidebar facets={facets} clearAllUrl="/shop" />)

      expect(screen.queryByText("Clear All")).not.toBeInTheDocument()
    })

    it("shows Clear All when brand filter is active", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar
          facets={facets}
          clearAllUrl="/shop"
          selectedBrands={["brand1"]}
        />
      )

      expect(screen.getByText("Clear All")).toBeInTheDocument()
    })

    it("shows Clear All when collection filter is active", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar
          facets={facets}
          clearAllUrl="/shop"
          selectedCollections={["col1"]}
        />
      )

      expect(screen.getByText("Clear All")).toBeInTheDocument()
    })

    it("shows Clear All when onSale is true", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar
          facets={facets}
          clearAllUrl="/shop"
          selectedOnSale={true}
        />
      )

      expect(screen.getByText("Clear All")).toBeInTheDocument()
    })

    it("shows Clear All when inStock is true", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar
          facets={facets}
          clearAllUrl="/shop"
          selectedInStock={true}
        />
      )

      expect(screen.getByText("Clear All")).toBeInTheDocument()
    })

    it("shows Clear All when price range is modified", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar
          facets={facets}
          clearAllUrl="/shop"
          priceRange={{ min: 100, max: 500 }}
        />
      )

      expect(screen.getByText("Clear All")).toBeInTheDocument()
    })

    it("shows Clear All when dynamic options are selected", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar
          facets={facets}
          clearAllUrl="/shop"
          selectedOptions={{ options_colour: ["red"] }}
        />
      )

      expect(screen.getByText("Clear All")).toBeInTheDocument()
    })
  })

  describe("hideFacets prop", () => {
    it("hides categories section when hideFacets includes 'categories'", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar facets={facets} hideFacets={["categories"]} />
      )

      expect(screen.queryByTestId("facet-options-categories")).not.toBeInTheDocument()
    })

    it("hides brands section when hideFacets includes 'brands'", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar facets={facets} hideFacets={["brands"]} />
      )

      expect(screen.queryByTestId("facet-options-brands")).not.toBeInTheDocument()
    })

    it("hides collections section when hideFacets includes 'collections'", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar facets={facets} hideFacets={["collections"]} />
      )

      expect(screen.queryByTestId("facet-options-collections")).not.toBeInTheDocument()
    })

    it("hides onSale section when hideFacets includes 'onSale'", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar facets={facets} hideFacets={["onSale"]} />
      )

      expect(screen.queryByTestId("filter-section-onSale")).not.toBeInTheDocument()
    })

    it("hides inStock section when hideFacets includes 'inStock'", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar facets={facets} hideFacets={["inStock"]} />
      )

      expect(screen.queryByTestId("filter-section-inStock")).not.toBeInTheDocument()
    })

    it("hides price section when hideFacets includes 'price'", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar facets={facets} hideFacets={["price"]} />
      )

      expect(screen.queryByTestId("filter-section-price")).not.toBeInTheDocument()
    })

    it("hides multiple facets", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar
          facets={facets}
          hideFacets={["categories", "brands", "onSale"]}
        />
      )

      expect(screen.queryByTestId("facet-options-categories")).not.toBeInTheDocument()
      expect(screen.queryByTestId("facet-options-brands")).not.toBeInTheDocument()
      expect(screen.queryByTestId("filter-section-onSale")).not.toBeInTheDocument()
      expect(screen.getByTestId("facet-options-collections")).toBeInTheDocument()
    })
  })

  describe("filter change handlers", () => {
    it("calls onInStockChange when inStock toggle is changed", async () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar facets={facets} {...mockHandlers} />
      )

      // Find the inStock section and its toggle button
      const inStockSection = screen.getByTestId("filter-section-inStock")
      const toggleButton = within(inStockSection).getByTestId("toggle-btn-show-only-in-stock-items")
      await user.click(toggleButton)

      expect(mockHandlers.onInStockChange).toHaveBeenCalledWith(true)
    })

    it("calls onPriceChange when price range is applied", async () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar facets={facets} {...mockHandlers} />
      )

      const applyButton = screen.getByText("Apply")
      await user.click(applyButton)

      expect(mockHandlers.onPriceChange).toHaveBeenCalledWith(0, 1000)
    })

    it("calls onCategoryChange when category checkbox is toggled", async () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar facets={facets} {...mockHandlers} />
      )

      const checkbox = screen.getByTestId("checkbox-categories-cat1")
      await user.click(checkbox)

      expect(mockHandlers.onCategoryChange).toHaveBeenCalledWith("cat1", true)
    })

    it("calls onBrandChange when brand checkbox is toggled", async () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar facets={facets} {...mockHandlers} />
      )

      const checkbox = screen.getByTestId("checkbox-brands-brand1")
      await user.click(checkbox)

      expect(mockHandlers.onBrandChange).toHaveBeenCalledWith("brand1", true)
    })

    it("calls onCollectionChange when collection checkbox is toggled", async () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar facets={facets} {...mockHandlers} />
      )

      const checkbox = screen.getByTestId("checkbox-collections-col1")
      await user.click(checkbox)

      expect(mockHandlers.onCollectionChange).toHaveBeenCalledWith("col1", true)
    })

    it("calls onSaleChange when sale toggle is changed", async () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar
          facets={facets}
          {...mockHandlers}
          selectedOnSale={false}
        />
      )

      // Find the onSale section and its toggle button
      const onSaleSection = screen.getByTestId("filter-section-onSale")
      const toggleButton = within(onSaleSection).getByTestId("toggle-btn-show-only-sale-items")
      await user.click(toggleButton)

      expect(mockHandlers.onSaleChange).toHaveBeenCalledWith(true)
    })

    it("calls onOptionChange when dynamic option checkbox is toggled", async () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar facets={facets} {...mockHandlers} />
      )

      const checkbox = screen.getByTestId("checkbox-options_colour-red")
      await user.click(checkbox)

      expect(mockHandlers.onOptionChange).toHaveBeenCalledWith("options_colour", "red", true)
    })
  })

  describe("active filter chips", () => {
    it("renders active filter chips when filters are active and onRemoveFilter is provided", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar
          facets={facets}
          selectedCategories={["cat1"]}
          onRemoveFilter={mockHandlers.onRemoveFilter}
        />
      )

      expect(screen.getByTestId("active-filter-chips")).toBeInTheDocument()
    })

    it("does not render active filter chips when no onRemoveFilter handler", () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar
          facets={facets}
          selectedCategories={["cat1"]}
        />
      )

      expect(screen.queryByTestId("active-filter-chips")).not.toBeInTheDocument()
    })

    it("calls onRemoveFilter when chip remove button is clicked", async () => {
      const facets = createMockFacets()
      render(
        <FilterSidebar
          facets={facets}
          selectedCategories={["cat1"]}
          onRemoveFilter={mockHandlers.onRemoveFilter}
        />
      )

      const removeButton = screen.getByTestId("remove-category")
      await user.click(removeButton)

      expect(mockHandlers.onRemoveFilter).toHaveBeenCalledWith("category", "cat1")
    })
  })

  describe("accordion default values", () => {
    it("sets correct default open accordion items", () => {
      const facets = createMockFacets()
      render(<FilterSidebar facets={facets} />)

      const accordion = screen.getByTestId("accordion")
      const defaultValue = accordion.getAttribute("data-default-value")

      expect(defaultValue).toContain("inStock")
      expect(defaultValue).toContain("price")
      expect(defaultValue).toContain("categories")
      expect(defaultValue).toContain("brands")
      expect(defaultValue).toContain("collections")
      expect(defaultValue).toContain("onSale")
    })
  })

  describe("edge cases", () => {
    it("does not render inStock section when no true option exists", () => {
      const facets = createMockFacets({
        inStock: [{ value: "false", count: 10 }],
      })
      render(<FilterSidebar facets={facets} />)

      expect(screen.queryByTestId("filter-section-inStock")).not.toBeInTheDocument()
    })

    it("does not render inStock section when true option has 0 count", () => {
      const facets = createMockFacets({
        inStock: [
          { value: "true", count: 0 },
          { value: "false", count: 10 },
        ],
      })
      render(<FilterSidebar facets={facets} />)

      expect(screen.queryByTestId("filter-section-inStock")).not.toBeInTheDocument()
    })

    it("does not render onSale section when no true option exists", () => {
      const facets = createMockFacets({
        onSale: [{ value: "false", count: 10 }],
      })
      render(<FilterSidebar facets={facets} />)

      expect(screen.queryByTestId("filter-section-onSale")).not.toBeInTheDocument()
    })

    it("does not render categories section when empty", () => {
      const facets = createMockFacets({ categories: [] })
      render(<FilterSidebar facets={facets} />)

      expect(screen.queryByTestId("facet-options-categories")).not.toBeInTheDocument()
    })

    it("does not render brands section when empty", () => {
      const facets = createMockFacets({ brands: [] })
      render(<FilterSidebar facets={facets} />)

      expect(screen.queryByTestId("facet-options-brands")).not.toBeInTheDocument()
    })

    it("does not render collections section when empty", () => {
      const facets = createMockFacets({ collections: [] })
      render(<FilterSidebar facets={facets} />)

      expect(screen.queryByTestId("facet-options-collections")).not.toBeInTheDocument()
    })

    it("uses provided priceRange over facets priceRange", () => {
      const facets = createMockFacets({ priceRange: { min: 0, max: 1000 } })
      render(
        <FilterSidebar
          facets={facets}
          priceRange={{ min: 100, max: 500 }}
        />
      )

      expect(screen.getByTestId("current-min")).toHaveTextContent("100")
      expect(screen.getByTestId("current-max")).toHaveTextContent("500")
    })
  })
})
