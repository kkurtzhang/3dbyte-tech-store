import { render, screen } from "@testing-library/react"

jest.mock("lucide-react", () => ({
  ShieldCheck: () => <span data-testid="shield-check-icon" />
}))

import CheckoutLayout from "../layout"

describe("CheckoutLayout", () => {
  it("keeps the checkout header focused on the secure checkout state", () => {
    render(
      <CheckoutLayout>
        <div>Checkout content</div>
      </CheckoutLayout>
    )

    expect(screen.queryByRole("link", { name: "3D Byte Tech" })).not.toBeInTheDocument()
    expect(screen.getByText("Secure checkout")).toBeInTheDocument()
    expect(screen.queryByText("Secure_Channel_Active")).not.toBeInTheDocument()
  })
})
