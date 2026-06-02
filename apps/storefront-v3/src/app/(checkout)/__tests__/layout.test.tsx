import { render, screen } from "@testing-library/react"

jest.mock("lucide-react", () => ({
  ShieldCheck: () => <span data-testid="shield-check-icon" />
}))

import CheckoutLayout from "../layout"

describe("CheckoutLayout", () => {
  it("uses full brand and human-readable secure checkout copy", () => {
    render(
      <CheckoutLayout>
        <div>Checkout content</div>
      </CheckoutLayout>
    )

    expect(screen.getByRole("link", { name: "3D Byte Tech" })).toHaveAttribute(
      "href",
      "/"
    )
    expect(
      screen
        .getByRole("link", { name: "3D Byte Tech" })
        .querySelector('img[src*="/brand/logos/logo-primary-horizontal-640w.png"]')
    ).toBeInTheDocument()
    expect(screen.getByText("Secure checkout")).toBeInTheDocument()
    expect(screen.queryByText("Secure_Channel_Active")).not.toBeInTheDocument()
  })
})
