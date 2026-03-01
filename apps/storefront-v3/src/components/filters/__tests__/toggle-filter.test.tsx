import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ToggleFilter } from "../toggle-filter"

// Mock Checkbox component
jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid={`checkbox-${id}`}
      aria-checked={checked}
    />
  ),
}))

// Mock Label component
jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode
    htmlFor: string
  }) => <label htmlFor={htmlFor}>{children}</label>,
}))

describe("ToggleFilter", () => {
  const user = userEvent.setup()

  const defaultProps = {
    id: "test-toggle",
    label: "Test Filter",
    checked: false,
    onChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("label rendering", () => {
    it("renders the label text", () => {
      render(<ToggleFilter {...defaultProps} />)

      expect(screen.getByText("Test Filter")).toBeInTheDocument()
    })

    it("associates label with checkbox via htmlFor", () => {
      render(<ToggleFilter {...defaultProps} />)

      const label = screen.getByText("Test Filter").closest("label")
      expect(label).toHaveAttribute("for", "test-toggle")
    })

    it("renders different labels for different props", () => {
      render(
        <ToggleFilter {...defaultProps} label="Show only sale items" />
      )

      expect(screen.getByText("Show only sale items")).toBeInTheDocument()
    })
  })

  describe("checked state", () => {
    it("renders unchecked checkbox when checked is false", () => {
      render(<ToggleFilter {...defaultProps} checked={false} />)

      const checkbox = screen.getByTestId("checkbox-test-toggle")
      expect(checkbox).not.toBeChecked()
    })

    it("renders checked checkbox when checked is true", () => {
      render(<ToggleFilter {...defaultProps} checked={true} />)

      const checkbox = screen.getByTestId("checkbox-test-toggle")
      expect(checkbox).toBeChecked()
    })

    it("updates checked state when prop changes", () => {
      const { rerender } = render(<ToggleFilter {...defaultProps} checked={false} />)

      const checkbox = screen.getByTestId("checkbox-test-toggle")
      expect(checkbox).not.toBeChecked()

      rerender(<ToggleFilter {...defaultProps} checked={true} />)
      expect(checkbox).toBeChecked()
    })
  })

  describe("onChange handler", () => {
    it("calls onChange with true when unchecked checkbox is clicked", async () => {
      const onChange = jest.fn()
      render(<ToggleFilter {...defaultProps} checked={false} onChange={onChange} />)

      const checkbox = screen.getByTestId("checkbox-test-toggle")
      await user.click(checkbox)

      expect(onChange).toHaveBeenCalledWith(true)
    })

    it("calls onChange with false when checked checkbox is clicked", async () => {
      const onChange = jest.fn()
      render(<ToggleFilter {...defaultProps} checked={true} onChange={onChange} />)

      const checkbox = screen.getByTestId("checkbox-test-toggle")
      await user.click(checkbox)

      expect(onChange).toHaveBeenCalledWith(false)
    })

    it("calls onChange once per click", async () => {
      const onChange = jest.fn()
      render(<ToggleFilter {...defaultProps} onChange={onChange} />)

      const checkbox = screen.getByTestId("checkbox-test-toggle")
      await user.click(checkbox)

      expect(onChange).toHaveBeenCalledTimes(1)
    })
  })

  describe("count display", () => {
    it("does not show count when count prop is undefined", () => {
      render(<ToggleFilter {...defaultProps} />)

      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument()
    })

    it("shows count when count prop is provided", () => {
      render(<ToggleFilter {...defaultProps} count={42} />)

      expect(screen.getByText("(42)")).toBeInTheDocument()
    })

    it("shows count of 0", () => {
      render(<ToggleFilter {...defaultProps} count={0} />)

      expect(screen.getByText("(0)")).toBeInTheDocument()
    })

    it("shows large counts correctly", () => {
      render(<ToggleFilter {...defaultProps} count={10000} />)

      expect(screen.getByText("(10000)")).toBeInTheDocument()
    })
  })

  describe("accessibility", () => {
    it("has accessible checkbox with correct id", () => {
      render(<ToggleFilter {...defaultProps} />)

      const checkbox = screen.getByTestId("checkbox-test-toggle")
      expect(checkbox).toHaveAttribute("id", "test-toggle")
    })

    it("has aria-checked attribute reflecting state", () => {
      const { rerender } = render(<ToggleFilter {...defaultProps} checked={false} />)

      const checkbox = screen.getByTestId("checkbox-test-toggle")
      expect(checkbox).toHaveAttribute("aria-checked", "false")

      rerender(<ToggleFilter {...defaultProps} checked={true} />)
      expect(checkbox).toHaveAttribute("aria-checked", "true")
    })

    it("label is associated with checkbox", () => {
      render(<ToggleFilter {...defaultProps} />)

      const checkbox = screen.getByRole("checkbox")
      const label = screen.getByText("Test Filter").closest("label")

      expect(label).toHaveAttribute("for", checkbox.id)
    })
  })

  describe("different use cases", () => {
    it("works as inStock toggle", async () => {
      const onChange = jest.fn()
      render(
        <ToggleFilter
          id="inStock-toggle"
          label="Show only in-stock items"
          count={150}
          checked={true}
          onChange={onChange}
        />
      )

      expect(screen.getByText("Show only in-stock items")).toBeInTheDocument()
      expect(screen.getByText("(150)")).toBeInTheDocument()

      const checkbox = screen.getByTestId("checkbox-inStock-toggle")
      expect(checkbox).toBeChecked()

      await user.click(checkbox)
      expect(onChange).toHaveBeenCalledWith(false)
    })

    it("works as onSale toggle", async () => {
      const onChange = jest.fn()
      render(
        <ToggleFilter
          id="onSale-toggle"
          label="Show only sale items"
          count={25}
          checked={false}
          onChange={onChange}
        />
      )

      expect(screen.getByText("Show only sale items")).toBeInTheDocument()
      expect(screen.getByText("(25)")).toBeInTheDocument()

      const checkbox = screen.getByTestId("checkbox-onSale-toggle")
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(onChange).toHaveBeenCalledWith(true)
    })
  })
})
