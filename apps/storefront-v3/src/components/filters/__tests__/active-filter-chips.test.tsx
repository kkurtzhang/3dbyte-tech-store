import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ActiveFilterChips } from "../active-filter-chips"
import type { FilterFacets } from "@/features/shop/types/filters"

// Mock formatOptionLabel
jest.mock("@/features/shop/types/filters", () => ({
  ...jest.requireActual("@/features/shop/types/filters"),
  formatOptionLabel: (key: string) => {
    const labels: Record<string, string> = {
      options_colour: "Colour",
      options_size: "Size",
    }
    return labels[key] || key.replace("options_", "")
  },
}))

// Sample facets data factory
function createMockFacets(overrides: Partial<FilterFacets> = {}): FilterFacets {
  return {
    categories: [
      { value: "cat1", label: "3D Printers", count: 10 },
      { value: "cat2", label: "Filaments", count: 5 },
    ],
    brands: [
      { value: "brand1", label: "Prusa", count: 8 },
      { value: "brand2", label: "Bambu Lab", count: 3 },
    ],
    collections: [
      { value: "col1", label: "New Arrivals", count: 12 },
      { value: "col2", label: "Best Sellers", count: 8 },
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
      options_size: [
        { value: "large", count: 4 },
      ],
    },
    ...overrides,
  }
}

describe("ActiveFilterChips", () => {
  const user = userEvent.setup()

  const defaultProps = {
    facets: createMockFacets(),
    selectedCategories: [],
    selectedBrands: [],
    selectedCollections: [],
    selectedOnSale: false,
    selectedInStock: false,
    priceRange: { min: 0, max: 1000 },
    selectedOptions: {},
    onRemoveFilter: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("category chips", () => {
    it("renders chips for selected categories", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedCategories={["cat1"]}
        />
      )

      expect(screen.getByText("Category: 3D Printers")).toBeInTheDocument()
    })

    it("renders multiple category chips", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedCategories={["cat1", "cat2"]}
        />
      )

      expect(screen.getByText("Category: 3D Printers")).toBeInTheDocument()
      expect(screen.getByText("Category: Filaments")).toBeInTheDocument()
    })

    it("uses value as fallback when category not found in facets", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedCategories={["unknown-cat"]}
        />
      )

      expect(screen.getByText("Category: unknown-cat")).toBeInTheDocument()
    })

    it("calls onRemoveFilter with 'category' and id when remove button clicked", async () => {
      const onRemoveFilter = jest.fn()
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedCategories={["cat1"]}
          onRemoveFilter={onRemoveFilter}
        />
      )

      const removeButton = screen.getByLabelText("Remove 3D Printers category")
      await user.click(removeButton)

      expect(onRemoveFilter).toHaveBeenCalledWith("category", "cat1")
    })
  })

  describe("brand chips", () => {
    it("renders chips for selected brands", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedBrands={["brand1"]}
        />
      )

      expect(screen.getByText("Brand: Prusa")).toBeInTheDocument()
    })

    it("renders multiple brand chips", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedBrands={["brand1", "brand2"]}
        />
      )

      expect(screen.getByText("Brand: Prusa")).toBeInTheDocument()
      expect(screen.getByText("Brand: Bambu Lab")).toBeInTheDocument()
    })

    it("uses value as fallback when brand not found", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedBrands={["unknown-brand"]}
        />
      )

      expect(screen.getByText("Brand: unknown-brand")).toBeInTheDocument()
    })

    it("calls onRemoveFilter with 'brand' and id when remove button clicked", async () => {
      const onRemoveFilter = jest.fn()
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedBrands={["brand1"]}
          onRemoveFilter={onRemoveFilter}
        />
      )

      const removeButton = screen.getByLabelText("Remove Prusa brand")
      await user.click(removeButton)

      expect(onRemoveFilter).toHaveBeenCalledWith("brand", "brand1")
    })
  })

  describe("collection chips", () => {
    it("renders chips for selected collections", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedCollections={["col1"]}
        />
      )

      expect(screen.getByText("Collection: New Arrivals")).toBeInTheDocument()
    })

    it("renders multiple collection chips", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedCollections={["col1", "col2"]}
        />
      )

      expect(screen.getByText("Collection: New Arrivals")).toBeInTheDocument()
      expect(screen.getByText("Collection: Best Sellers")).toBeInTheDocument()
    })

    it("uses value as fallback when collection not found", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedCollections={["unknown-col"]}
        />
      )

      expect(screen.getByText("Collection: unknown-col")).toBeInTheDocument()
    })

    it("calls onRemoveFilter with 'collection' and id when remove button clicked", async () => {
      const onRemoveFilter = jest.fn()
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedCollections={["col1"]}
          onRemoveFilter={onRemoveFilter}
        />
      )

      const removeButton = screen.getByLabelText("Remove New Arrivals collection")
      await user.click(removeButton)

      expect(onRemoveFilter).toHaveBeenCalledWith("collection", "col1")
    })
  })

  describe("onSale chip", () => {
    it("renders chip when selectedOnSale is true", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedOnSale={true}
        />
      )

      expect(screen.getByText("On Sale")).toBeInTheDocument()
    })

    it("does not render chip when selectedOnSale is false", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedOnSale={false}
        />
      )

      expect(screen.queryByText("On Sale")).not.toBeInTheDocument()
    })

    it("calls onRemoveFilter with 'onSale' when remove button clicked", async () => {
      const onRemoveFilter = jest.fn()
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedOnSale={true}
          onRemoveFilter={onRemoveFilter}
        />
      )

      const removeButton = screen.getByLabelText("Remove on sale filter")
      await user.click(removeButton)

      expect(onRemoveFilter).toHaveBeenCalledWith("onSale")
    })
  })

  describe("inStock chip", () => {
    it("renders chip when selectedInStock is true", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedInStock={true}
        />
      )

      expect(screen.getByText("In Stock")).toBeInTheDocument()
    })

    it("does not render chip when selectedInStock is false", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedInStock={false}
        />
      )

      expect(screen.queryByText("In Stock")).not.toBeInTheDocument()
    })

    it("calls onRemoveFilter with 'inStock' when remove button clicked", async () => {
      const onRemoveFilter = jest.fn()
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedInStock={true}
          onRemoveFilter={onRemoveFilter}
        />
      )

      const removeButton = screen.getByLabelText("Remove in stock filter")
      await user.click(removeButton)

      expect(onRemoveFilter).toHaveBeenCalledWith("inStock")
    })
  })

  describe("price range chip", () => {
    it("renders chip when price range differs from facets range", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          priceRange={{ min: 100, max: 500 }}
        />
      )

      expect(screen.getByText("Price: $100 - $500")).toBeInTheDocument()
    })

    it("does not render chip when price range matches facets range", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          priceRange={{ min: 0, max: 1000 }}
        />
      )

      expect(screen.queryByText(/Price:/)).not.toBeInTheDocument()
    })

    it("renders chip when only min differs", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          priceRange={{ min: 100, max: 1000 }}
        />
      )

      expect(screen.getByText("Price: $100 - $1000")).toBeInTheDocument()
    })

    it("renders chip when only max differs", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          priceRange={{ min: 0, max: 500 }}
        />
      )

      expect(screen.getByText("Price: $0 - $500")).toBeInTheDocument()
    })

    it("calls onRemoveFilter with 'price' when remove button clicked", async () => {
      const onRemoveFilter = jest.fn()
      render(
        <ActiveFilterChips
          {...defaultProps}
          priceRange={{ min: 100, max: 500 }}
          onRemoveFilter={onRemoveFilter}
        />
      )

      const removeButton = screen.getByLabelText("Remove price range filter")
      await user.click(removeButton)

      expect(onRemoveFilter).toHaveBeenCalledWith("price")
    })
  })

  describe("dynamic options chips", () => {
    it("renders chips for selected dynamic options", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedOptions={{ options_colour: ["red"] }}
        />
      )

      expect(screen.getByText("Colour: red")).toBeInTheDocument()
    })

    it("renders multiple values for same option", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedOptions={{ options_colour: ["red", "blue"] }}
        />
      )

      expect(screen.getByText("Colour: red")).toBeInTheDocument()
      expect(screen.getByText("Colour: blue")).toBeInTheDocument()
    })

    it("renders chips for multiple option types", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedOptions={{
            options_colour: ["red"],
            options_size: ["large"],
          }}
        />
      )

      expect(screen.getByText("Colour: red")).toBeInTheDocument()
      expect(screen.getByText("Size: large")).toBeInTheDocument()
    })

    it("calls onRemoveFilter with option key and value when remove button clicked", async () => {
      const onRemoveFilter = jest.fn()
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedOptions={{ options_colour: ["red"] }}
          onRemoveFilter={onRemoveFilter}
        />
      )

      const removeButton = screen.getByLabelText("Remove red Colour")
      await user.click(removeButton)

      expect(onRemoveFilter).toHaveBeenCalledWith("options_colour", "red")
    })
  })

  describe("combined filters", () => {
    it("renders all active filter types together", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedCategories={["cat1"]}
          selectedBrands={["brand1"]}
          selectedCollections={["col1"]}
          selectedOnSale={true}
          selectedInStock={true}
          priceRange={{ min: 100, max: 500 }}
          selectedOptions={{ options_colour: ["red"] }}
        />
      )

      expect(screen.getByText("Category: 3D Printers")).toBeInTheDocument()
      expect(screen.getByText("Brand: Prusa")).toBeInTheDocument()
      expect(screen.getByText("Collection: New Arrivals")).toBeInTheDocument()
      expect(screen.getByText("On Sale")).toBeInTheDocument()
      expect(screen.getByText("In Stock")).toBeInTheDocument()
      expect(screen.getByText("Price: $100 - $500")).toBeInTheDocument()
      expect(screen.getByText("Colour: red")).toBeInTheDocument()
    })

    it("does not render anything when no filters are active", () => {
      const { container } = render(<ActiveFilterChips {...defaultProps} />)

      expect(container.firstChild).toBeEmptyDOMElement()
    })
  })

  describe("accessibility", () => {
    it("has proper aria-labels for remove buttons", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedCategories={["cat1"]}
          selectedBrands={["brand1"]}
          selectedOnSale={true}
        />
      )

      expect(screen.getByLabelText("Remove 3D Printers category")).toBeInTheDocument()
      expect(screen.getByLabelText("Remove Prusa brand")).toBeInTheDocument()
      expect(screen.getByLabelText("Remove on sale filter")).toBeInTheDocument()
    })

    it("has remove buttons that are keyboard accessible", () => {
      render(
        <ActiveFilterChips
          {...defaultProps}
          selectedCategories={["cat1"]}
        />
      )

      const removeButton = screen.getByLabelText("Remove 3D Printers category")
      expect(removeButton.tagName).toBe("BUTTON")
    })
  })
})
