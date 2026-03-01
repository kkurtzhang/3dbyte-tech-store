import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PriceRangeSlider } from "../price-range-slider"

// Mock the Slider component to simplify testing
jest.mock("@/components/ui/slider", () => ({
  Slider: ({
    value,
    onValueChange,
    min,
    max,
    step,
  }: {
    value: number[]
    onValueChange: (value: number[]) => void
    min: number
    max: number
    step: number
  }) => (
    <div
      data-testid="slider"
      data-value={value.join(",")}
      data-min={min}
      data-max={max}
      data-step={step}
    >
      <button
        type="button"
        data-testid="slider-change-min"
        onClick={() => onValueChange([min + 100, value[1]])}
      >
        Change Min
      </button>
      <button
        type="button"
        data-testid="slider-change-max"
        onClick={() => onValueChange([value[0], max - 100])}
      >
        Change Max
      </button>
      <button
        type="button"
        data-testid="slider-change-both"
        onClick={() => onValueChange([min + 50, max - 50])}
      >
        Change Both
      </button>
    </div>
  ),
}))

// Mock Button component
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
    size?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}))

describe("PriceRangeSlider", () => {
  const user = userEvent.setup()

  const defaultProps = {
    min: 0,
    max: 1000,
    currentMin: 0,
    currentMax: 1000,
    onApply: jest.fn(),
    onClear: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("initial value rendering", () => {
    it("renders with initial values", () => {
      render(<PriceRangeSlider {...defaultProps} />)

      expect(screen.getByTestId("slider")).toHaveAttribute("data-value", "0,1000")
      expect(screen.getByText("$0")).toBeInTheDocument()
      expect(screen.getByText("$1000")).toBeInTheDocument()
    })

    it("renders with custom initial values", () => {
      render(
        <PriceRangeSlider
          {...defaultProps}
          currentMin={100}
          currentMax={500}
        />
      )

      expect(screen.getByTestId("slider")).toHaveAttribute("data-value", "100,500")
      expect(screen.getByText("$100")).toBeInTheDocument()
      expect(screen.getByText("$500")).toBeInTheDocument()
    })

    it("passes correct min/max/step to slider", () => {
      render(<PriceRangeSlider {...defaultProps} />)

      const slider = screen.getByTestId("slider")
      expect(slider).toHaveAttribute("data-min", "0")
      expect(slider).toHaveAttribute("data-max", "1000")
      expect(slider).toHaveAttribute("data-step", "10")
    })
  })

  describe("value changes", () => {
    it("updates local state when slider value changes", async () => {
      render(<PriceRangeSlider {...defaultProps} />)

      const changeMinButton = screen.getByTestId("slider-change-min")
      await user.click(changeMinButton)

      // Local state should update - displayed values change
      expect(screen.getByText("$100")).toBeInTheDocument()
    })

    it("calls onApply with correct values when Apply button is clicked", async () => {
      const onApply = jest.fn()
      render(<PriceRangeSlider {...defaultProps} onApply={onApply} />)

      // Change slider value
      const changeBothButton = screen.getByTestId("slider-change-both")
      await user.click(changeBothButton)

      // Click Apply
      const applyButton = screen.getByText("Apply")
      await user.click(applyButton)

      expect(onApply).toHaveBeenCalledWith(50, 950)
    })

    it("does not call onApply when Apply button is disabled (no change)", async () => {
      const onApply = jest.fn()
      render(<PriceRangeSlider {...defaultProps} onApply={onApply} />)

      const applyButton = screen.getByText("Apply")
      await user.click(applyButton)

      expect(onApply).not.toHaveBeenCalled()
    })

    it("enables Apply button when value changes", async () => {
      render(<PriceRangeSlider {...defaultProps} />)

      const applyButton = screen.getByText("Apply")
      expect(applyButton).toBeDisabled()

      const changeBothButton = screen.getByTestId("slider-change-both")
      await user.click(changeBothButton)

      expect(applyButton).not.toBeDisabled()
    })
  })

  describe("clear functionality", () => {
    it("calls onClear when Clear button is clicked", async () => {
      const onClear = jest.fn()
      // Render with non-default values so Clear button is enabled
      render(
        <PriceRangeSlider
          {...defaultProps}
          currentMin={100}
          currentMax={900}
          onClear={onClear}
        />
      )

      const clearButton = screen.getByText("Clear")
      await user.click(clearButton)

      expect(onClear).toHaveBeenCalledTimes(1)
    })

    it("resets local state to min/max when Clear is clicked", async () => {
      render(
        <PriceRangeSlider
          {...defaultProps}
          currentMin={200}
          currentMax={800}
        />
      )

      // Verify initial state
      expect(screen.getByText("$200")).toBeInTheDocument()
      expect(screen.getByText("$800")).toBeInTheDocument()

      const clearButton = screen.getByText("Clear")
      await user.click(clearButton)

      // Should reset to min/max
      expect(screen.getByText("$0")).toBeInTheDocument()
      expect(screen.getByText("$1000")).toBeInTheDocument()
    })

    it("disables Clear button when at min/max", () => {
      render(<PriceRangeSlider {...defaultProps} />)

      const clearButton = screen.getByText("Clear")
      expect(clearButton).toBeDisabled()
    })

    it("enables Clear button when value differs from min/max", async () => {
      render(
        <PriceRangeSlider
          {...defaultProps}
          currentMin={100}
          currentMax={900}
        />
      )

      const clearButton = screen.getByText("Clear")
      expect(clearButton).not.toBeDisabled()
    })
  })

  describe("min/max constraints", () => {
    it("uses correct min constraint from props", () => {
      render(
        <PriceRangeSlider
          {...defaultProps}
          min={50}
          currentMin={50}
        />
      )

      const slider = screen.getByTestId("slider")
      expect(slider).toHaveAttribute("data-min", "50")
    })

    it("uses correct max constraint from props", () => {
      render(
        <PriceRangeSlider
          {...defaultProps}
          max={5000}
          currentMax={5000}
        />
      )

      const slider = screen.getByTestId("slider")
      expect(slider).toHaveAttribute("data-max", "5000")
    })

    it("handles same min and max values", () => {
      render(
        <PriceRangeSlider
          {...defaultProps}
          min={100}
          max={100}
          currentMin={100}
          currentMax={100}
        />
      )

      // When min === max, there should be two $100 labels (one for min, one for max)
      const dollarLabels = screen.getAllByText("$100")
      expect(dollarLabels.length).toBe(2)
    })
  })

  describe("state synchronization", () => {
    it("displays updated values when currentMin prop changes on remount", () => {
      // First render with initial values
      const { unmount } = render(<PriceRangeSlider {...defaultProps} />)

      expect(screen.getByTestId("slider")).toHaveAttribute("data-value", "0,1000")
      expect(screen.getByText("$0")).toBeInTheDocument()

      unmount()

      // Re-render with new values (simulating prop change on remount)
      render(
        <PriceRangeSlider
          {...defaultProps}
          currentMin={200}
          currentMax={1000}
        />
      )

      expect(screen.getByTestId("slider")).toHaveAttribute("data-value", "200,1000")
      expect(screen.getByText("$200")).toBeInTheDocument()
    })

    it("displays updated values when currentMax prop changes on remount", () => {
      // First render with initial values
      const { unmount } = render(<PriceRangeSlider {...defaultProps} />)

      expect(screen.getByTestId("slider")).toHaveAttribute("data-value", "0,1000")
      expect(screen.getByText("$1000")).toBeInTheDocument()

      unmount()

      // Re-render with new values (simulating prop change on remount)
      render(
        <PriceRangeSlider
          {...defaultProps}
          currentMin={0}
          currentMax={500}
        />
      )

      expect(screen.getByTestId("slider")).toHaveAttribute("data-value", "0,500")
      expect(screen.getByText("$500")).toBeInTheDocument()
    })
  })

  describe("accessibility and UI", () => {
    it("has Apply button with correct styling props", () => {
      render(<PriceRangeSlider {...defaultProps} />)

      const applyButton = screen.getByText("Apply")
      expect(applyButton).toHaveAttribute("data-size", "sm")
    })

    it("has Clear button with correct styling props", () => {
      render(<PriceRangeSlider {...defaultProps} />)

      const clearButton = screen.getByText("Clear")
      expect(clearButton).toHaveAttribute("data-variant", "outline")
      expect(clearButton).toHaveAttribute("data-size", "sm")
    })

    it("displays price range labels", () => {
      render(
        <PriceRangeSlider
          {...defaultProps}
          currentMin={250}
          currentMax={750}
        />
      )

      // Should show current range values
      expect(screen.getByText("$250")).toBeInTheDocument()
      expect(screen.getByText("$750")).toBeInTheDocument()
    })
  })
})
