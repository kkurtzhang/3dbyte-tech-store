import { render, screen } from "@testing-library/react"
import { useStripe } from "@stripe/react-stripe-js"
import { StripeWrapper } from "../stripe-wrapper"

function StripeConsumer() {
  useStripe()
  return <div>Stripe child rendered</div>
}

describe("StripeWrapper", () => {
  it("does not render Stripe hook consumers outside Elements when no client secret exists", () => {
    expect(() =>
      render(
        <StripeWrapper>
          <StripeConsumer />
        </StripeWrapper>
      )
    ).not.toThrow()

    expect(screen.queryByText("Stripe child rendered")).not.toBeInTheDocument()
    expect(screen.getByText("Secure payment setup is not available.")).toBeInTheDocument()
  })
})
