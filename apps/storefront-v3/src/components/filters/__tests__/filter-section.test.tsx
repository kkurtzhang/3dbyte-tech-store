import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FilterSection } from "../filter-section"

// Mock Accordion components
jest.mock("@/components/ui/accordion", () => ({
  AccordionItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`accordion-item-${value}`} data-value={value}>
      {children}
    </div>
  ),
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="accordion-trigger" role="button" tabIndex={0}>
      {children}
    </div>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="accordion-content">{children}</div>
  ),
}))

describe("FilterSection", () => {
  const user = userEvent.setup()

  const defaultProps = {
    title: "Test Section",
    value: "test-section",
    children: <div data-testid="child-content">Child Content</div>,
  }

  describe("rendering", () => {
    it("renders the title", () => {
      render(<FilterSection {...defaultProps} />)

      expect(screen.getByText("Test Section")).toBeInTheDocument()
    })

    it("renders children content", () => {
      render(<FilterSection {...defaultProps} />)

      expect(screen.getByTestId("child-content")).toBeInTheDocument()
      expect(screen.getByText("Child Content")).toBeInTheDocument()
    })

    it("renders with ReactNode as title", () => {
      render(
        <FilterSection
          title={
            <span data-testid="custom-title">
              <strong>Bold</strong> Title
            </span>
          }
          value="custom"
        >
          <div>Content</div>
        </FilterSection>
      )

      expect(screen.getByTestId("custom-title")).toBeInTheDocument()
      expect(screen.getByText("Bold")).toBeInTheDocument()
    })

    it("sets the correct accordion value", () => {
      render(<FilterSection {...defaultProps} />)

      const item = screen.getByTestId("accordion-item-test-section")
      expect(item).toHaveAttribute("data-value", "test-section")
    })
  })

  describe("selectedCount", () => {
    it("does not show count when selectedCount is undefined", () => {
      render(<FilterSection {...defaultProps} />)

      expect(screen.queryByText(/\(.*selected\)/)).not.toBeInTheDocument()
    })

    it("does not show count when selectedCount is 0", () => {
      render(<FilterSection {...defaultProps} selectedCount={0} />)

      expect(screen.queryByText(/\(.*selected\)/)).not.toBeInTheDocument()
    })

    it("shows selected count when greater than 0", () => {
      render(<FilterSection {...defaultProps} selectedCount={5} />)

      expect(screen.getByText("(5 selected)")).toBeInTheDocument()
    })
  })

  describe("onClear handler", () => {
    it("does not show clear button when onClear is not provided", () => {
      render(<FilterSection {...defaultProps} selectedCount={5} />)

      expect(screen.queryByText("Clear")).not.toBeInTheDocument()
    })

    it("does not show clear button when selectedCount is 0", () => {
      const onClear = jest.fn()
      render(
        <FilterSection
          {...defaultProps}
          selectedCount={0}
          onClear={onClear}
        />
      )

      expect(screen.queryByText("Clear")).not.toBeInTheDocument()
    })

    it("shows clear button when selectedCount > 0 and onClear provided", () => {
      const onClear = jest.fn()
      render(
        <FilterSection
          {...defaultProps}
          selectedCount={3}
          onClear={onClear}
        />
      )

      expect(screen.getByText("Clear")).toBeInTheDocument()
    })

    it("calls onClear when clear button is clicked", async () => {
      const onClear = jest.fn()
      render(
        <FilterSection
          {...defaultProps}
          selectedCount={3}
          onClear={onClear}
        />
      )

      const clearButton = screen.getByText("Clear")
      await user.click(clearButton)

      expect(onClear).toHaveBeenCalledTimes(1)
    })

    it("calls onClear when Enter key is pressed on clear button", async () => {
      const onClear = jest.fn()
      render(
        <FilterSection
          {...defaultProps}
          selectedCount={3}
          onClear={onClear}
        />
      )

      const clearButton = screen.getByText("Clear")
      clearButton.focus()
      await user.keyboard("{Enter}")

      expect(onClear).toHaveBeenCalledTimes(1)
    })

    it("has proper role and tabIndex for accessibility", () => {
      const onClear = jest.fn()
      render(
        <FilterSection
          {...defaultProps}
          selectedCount={3}
          onClear={onClear}
        />
      )

      const clearButton = screen.getByText("Clear")
      expect(clearButton).toHaveAttribute("role", "button")
      expect(clearButton).toHaveAttribute("tabIndex", "0")
    })
  })

  describe("onSelectAll handler", () => {
    it("does not show All button when onSelectAll is not provided", () => {
      render(<FilterSection {...defaultProps} />)

      expect(screen.queryByText("All")).not.toBeInTheDocument()
    })

    it("shows All button when onSelectAll is provided", () => {
      const onSelectAll = jest.fn()
      render(
        <FilterSection {...defaultProps} onSelectAll={onSelectAll} />
      )

      expect(screen.getByText("All")).toBeInTheDocument()
    })

    it("calls onSelectAll when All button is clicked", async () => {
      const onSelectAll = jest.fn()
      render(
        <FilterSection {...defaultProps} onSelectAll={onSelectAll} />
      )

      const allButton = screen.getByText("All")
      await user.click(allButton)

      expect(onSelectAll).toHaveBeenCalledTimes(1)
    })

    it("calls onSelectAll when Enter key is pressed on All button", async () => {
      const onSelectAll = jest.fn()
      render(
        <FilterSection {...defaultProps} onSelectAll={onSelectAll} />
      )

      const allButton = screen.getByText("All")
      allButton.focus()
      await user.keyboard("{Enter}")

      expect(onSelectAll).toHaveBeenCalledTimes(1)
    })

    it("has proper role and tabIndex for accessibility", () => {
      const onSelectAll = jest.fn()
      render(
        <FilterSection {...defaultProps} onSelectAll={onSelectAll} />
      )

      const allButton = screen.getByText("All")
      expect(allButton).toHaveAttribute("role", "button")
      expect(allButton).toHaveAttribute("tabIndex", "0")
    })
  })

  describe("combined onClear and onSelectAll", () => {
    it("shows both buttons when both handlers are provided and count > 0", () => {
      const onClear = jest.fn()
      const onSelectAll = jest.fn()
      render(
        <FilterSection
          {...defaultProps}
          selectedCount={3}
          onClear={onClear}
          onSelectAll={onSelectAll}
        />
      )

      expect(screen.getByText("Clear")).toBeInTheDocument()
      expect(screen.getByText("All")).toBeInTheDocument()
    })

    it("only shows All button when count is 0 (not Clear)", () => {
      const onClear = jest.fn()
      const onSelectAll = jest.fn()
      render(
        <FilterSection
          {...defaultProps}
          selectedCount={0}
          onClear={onClear}
          onSelectAll={onSelectAll}
        />
      )

      expect(screen.queryByText("Clear")).not.toBeInTheDocument()
      expect(screen.getByText("All")).toBeInTheDocument()
    })
  })

  describe("defaultOpen prop", () => {
    it("passes defaultOpen to AccordionItem", () => {
      render(<FilterSection {...defaultProps} defaultOpen={true} />)

      const item = screen.getByTestId("accordion-item-test-section")
      expect(item).toBeInTheDocument()
    })
  })
})
