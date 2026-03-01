import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ShopSort, getSortOrder, type SortOption } from "../shop-sort"

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron-down" />,
  Check: () => <span data-testid="check" />,
  ArrowUpDown: () => <span data-testid="arrow-up-down" />,
}))

// Mock next/navigation
const mockPush = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/search",
}))

describe("ShopSort", () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockSearchParams = new URLSearchParams()
  })

  describe("rendering", () => {
    it("renders sort label", () => {
      render(<ShopSort />)
      expect(screen.getByText("Sort by:")).toBeInTheDocument()
    })

    it("renders select trigger", () => {
      render(<ShopSort />)
      expect(screen.getByRole("combobox")).toBeInTheDocument()
    })

    it("shows 'Newest' as default selected value", () => {
      render(<ShopSort />)
      expect(screen.getByText("Newest")).toBeInTheDocument()
    })

    it("displays all sort options when opened", async () => {
      const user = userEvent.setup()
      render(<ShopSort />)

      await user.click(screen.getByRole("combobox"))

      expect(screen.getByRole("option", { name: /newest/i })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: /price: low to high/i })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: /price: high to low/i })).toBeInTheDocument()
    })
  })

  describe("sorting behavior", () => {
    it("selects newest by default when no sort param", () => {
      render(<ShopSort />)
      expect(screen.getByText("Newest")).toBeInTheDocument()
    })

    it("displays current sort from URL params", () => {
      mockSearchParams.set("sort", "price-asc")
      render(<ShopSort />)
      expect(screen.getByText("Price: Low to High")).toBeInTheDocument()
    })

    it("updates URL when sort option changes", async () => {
      const user = userEvent.setup()
      render(<ShopSort />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByRole("option", { name: /price: low to high/i }))

      expect(mockPush).toHaveBeenCalledTimes(1)
      const pushedUrl = mockPush.mock.calls[0][0]
      expect(pushedUrl).toContain("sort=price-asc")
    })

    it("preserves existing search params when changing sort", async () => {
      mockSearchParams.set("q", "filament")
      mockSearchParams.set("category", "cat_123")

      const user = userEvent.setup()
      render(<ShopSort />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByRole("option", { name: /price: high to low/i }))

      const pushedUrl = mockPush.mock.calls[0][0]
      expect(pushedUrl).toContain("q=filament")
      expect(pushedUrl).toContain("category=cat_123")
      expect(pushedUrl).toContain("sort=price-desc")
    })

    it("resets to page 1 when sort changes", async () => {
      mockSearchParams.set("page", "3")

      const user = userEvent.setup()
      render(<ShopSort />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByRole("option", { name: /price: low to high/i }))

      const pushedUrl = mockPush.mock.calls[0][0]
      // Page should not be in URL (defaults to 1)
      expect(pushedUrl).not.toContain("page=")
    })

    it("does not include sort param when selecting newest (default)", async () => {
      mockSearchParams.set("sort", "price-asc")

      const user = userEvent.setup()
      render(<ShopSort />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByRole("option", { name: /newest/i }))

      const pushedUrl = mockPush.mock.calls[0][0]
      // Newest is default, so sort param should not be in URL
      expect(pushedUrl).not.toContain("sort=")
    })

    it("uses custom basePath when provided", async () => {
      const user = userEvent.setup()
      render(<ShopSort basePath="/brands/esun" />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByRole("option", { name: /price: low to high/i }))

      const pushedUrl = mockPush.mock.calls[0][0]
      expect(pushedUrl).toContain("/brands/esun")
    })

    it("preserves dynamic options params", async () => {
      mockSearchParams.set("options_colour", "black,white")
      mockSearchParams.set("options_size", "0.4mm")

      const user = userEvent.setup()
      render(<ShopSort />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByRole("option", { name: /price: low to high/i }))

      const pushedUrl = mockPush.mock.calls[0][0]
      expect(pushedUrl).toContain("options_colour")
      expect(pushedUrl).toContain("options_size")
    })
  })

  describe("accessibility", () => {
    it("has accessible label", () => {
      render(<ShopSort />)
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
    })

    it("has accessible options", async () => {
      const user = userEvent.setup()
      render(<ShopSort />)

      await user.click(screen.getByRole("combobox"))

      const options = screen.getAllByRole("option")
      expect(options).toHaveLength(3)
    })
  })

  describe("custom className", () => {
    it("applies custom className", () => {
      render(<ShopSort className="custom-class" />)
      const container = screen.getByText("Sort by:").parentElement
      expect(container).toHaveClass("custom-class")
    })
  })
})

describe("getSortOrder", () => {
  it("returns correct order for newest", () => {
    expect(getSortOrder("newest")).toBe("created_at_timestamp:desc")
  })

  it("returns correct order for price-asc", () => {
    expect(getSortOrder("price-asc")).toBe("price_aud:asc")
  })

  it("returns correct order for price-desc", () => {
    expect(getSortOrder("price-desc")).toBe("price_aud:desc")
  })

  it("returns default order for unknown sort", () => {
    expect(getSortOrder("unknown" as SortOption)).toBe("created_at_timestamp:desc")
  })
})
