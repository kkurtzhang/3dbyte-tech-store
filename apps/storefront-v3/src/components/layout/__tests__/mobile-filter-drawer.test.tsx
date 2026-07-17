import { fireEvent, render, screen } from "@testing-library/react"
import { MobileFilterDrawer } from "../mobile-filter-drawer"

jest.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams("category=cat_1&brand=brand_1&page=2&sort=newest"),
}))

jest.mock("lucide-react", () => ({
  SlidersHorizontal: () => <span />,
}))

describe("MobileFilterDrawer", () => {
  it("shows the active filter count and explicit apply and reset actions", () => {
    render(
      <MobileFilterDrawer resetUrl="/shop">
        <div>Filter controls</div>
      </MobileFilterDrawer>
    )

    expect(
      screen.getByRole("button", { name: "Filters, 2 active" })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Filters, 2 active" }))

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Apply filters" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Reset filters" })).toHaveAttribute(
      "href",
      "/shop"
    )
  })
})
