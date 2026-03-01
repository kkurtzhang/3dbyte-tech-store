import { render, screen, fireEvent } from "@testing-library/react"
import { CheckoutStepper, CHECKOUT_STEPS, type CheckoutStepId } from "../checkout-stepper"

// Mock lucide-react
jest.mock("lucide-react", () => ({
  Check: () => <span data-testid="check-icon">✓</span>,
  ChevronLeft: () => <span data-testid="chevron-left">←</span>,
  ChevronRight: () => <span data-testid="chevron-right">→</span>,
}))

describe("CheckoutStepper", () => {
  const defaultProps = {
    currentStep: "shipping" as CheckoutStepId,
  }

  it("renders all checkout steps", () => {
    render(<CheckoutStepper {...defaultProps} />)

    CHECKOUT_STEPS.forEach((step) => {
      expect(screen.getByLabelText(step.label)).toBeInTheDocument()
    })
  })

  it("highlights current step", () => {
    render(<CheckoutStepper currentStep="payment" />)

    // Payment step should be the active one
    const paymentButton = screen.getByLabelText("Payment")
    expect(paymentButton).toBeInTheDocument()
  })

  it("shows completed steps with check icon", () => {
    render(
      <CheckoutStepper
        currentStep="payment"
        completedSteps={["shipping", "delivery"]}
      />
    )

    // Completed steps should show check icon
    const checkIcons = screen.getAllByTestId("check-icon")
    expect(checkIcons.length).toBe(4)
  })

  it("disables future steps that are not completed", () => {
    render(<CheckoutStepper currentStep="shipping" />)

    // Review step should be disabled
    const reviewButton = screen.getByLabelText("Review")
    expect(reviewButton).toBeDisabled()
  })

  it("allows clicking on completed steps", () => {
    const onStepClick = jest.fn()
    render(
      <CheckoutStepper
        currentStep="payment"
        completedSteps={["shipping", "delivery"]}
        onStepClick={onStepClick}
      />
    )

    const shippingButton = screen.getByLabelText("Shipping")
    fireEvent.click(shippingButton)

    expect(onStepClick).toHaveBeenCalledWith("shipping")
  })

  it("does not call onStepClick for disabled steps", () => {
    const onStepClick = jest.fn()
    render(
      <CheckoutStepper
        currentStep="shipping"
        onStepClick={onStepClick}
      />
    )

    const reviewButton = screen.getByLabelText("Review")
    fireEvent.click(reviewButton)

    expect(onStepClick).not.toHaveBeenCalled()
  })

  it("shows navigation buttons when showNavigation is true", () => {
    render(
      <CheckoutStepper
        {...defaultProps}
        showNavigation={true}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />
    )

    expect(screen.getByText("Back")).toBeInTheDocument()
    expect(screen.getByText("Continue")).toBeInTheDocument()
  })

  it("hides navigation buttons by default", () => {
    render(<CheckoutStepper {...defaultProps} />)

    expect(screen.queryByText("Back")).not.toBeInTheDocument()
    expect(screen.queryByText("Continue")).not.toBeInTheDocument()
  })

  it("disables back button on first step", () => {
    render(
      <CheckoutStepper
        currentStep="shipping"
        showNavigation={true}
        onBack={jest.fn()}
      />
    )

    expect(screen.getByText("Back")).toBeDisabled()
  })

  it("enables back button after first step", () => {
    render(
      <CheckoutStepper
        currentStep="delivery"
        showNavigation={true}
        onBack={jest.fn()}
      />
    )

    expect(screen.getByText("Back")).not.toBeDisabled()
  })

  it("hides continue button on last step", () => {
    render(
      <CheckoutStepper
        currentStep="confirmation"
        showNavigation={true}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />
    )

    expect(screen.queryByText("Continue")).not.toBeInTheDocument()
  })

  it("calls onBack when back button is clicked", () => {
    const onBack = jest.fn()
    render(
      <CheckoutStepper
        currentStep="delivery"
        showNavigation={true}
        onBack={onBack}
      />
    )

    fireEvent.click(screen.getByText("Back"))
    expect(onBack).toHaveBeenCalled()
  })

  it("calls onNext when continue button is clicked", () => {
    const onNext = jest.fn()
    render(
      <CheckoutStepper
        currentStep="shipping"
        showNavigation={true}
        onBack={jest.fn()}
        onNext={onNext}
      />
    )

    fireEvent.click(screen.getByText("Continue"))
    expect(onNext).toHaveBeenCalled()
  })

  it("calculates progress correctly", () => {
    const { container, rerender } = render(
      <CheckoutStepper currentStep="shipping" />
    )

    // First step - 0% progress
    const progressBar = container.querySelector(".bg-primary.transition-all")
    expect(progressBar).toHaveStyle({ width: "0%" })

    rerender(<CheckoutStepper currentStep="payment" />)

    // Third step - 50% progress (2 / 4 * 100)
    expect(progressBar).toHaveStyle({ width: "50%" })
  })

  it("allows navigation to any completed step regardless of order", () => {
    const onStepClick = jest.fn()
    render(
      <CheckoutStepper
        currentStep="review"
        completedSteps={["shipping", "payment"]}
        onStepClick={onStepClick}
      />
    )

    // Can navigate to completed payment step
    const paymentButton = screen.getByLabelText("Payment")
    expect(paymentButton).not.toBeDisabled()

    fireEvent.click(paymentButton)
    expect(onStepClick).toHaveBeenCalledWith("payment")
  })

  it("renders mobile stepper with short labels", () => {
    // Mock window.innerWidth to trigger mobile view
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    })

    render(<CheckoutStepper currentStep="shipping" />)

    // Should render short labels on mobile
    expect(screen.getByText("Ship")).toBeInTheDocument()
  })
})
