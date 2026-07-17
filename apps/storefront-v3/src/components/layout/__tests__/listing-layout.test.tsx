import { render, screen } from "@testing-library/react"

jest.mock("lucide-react", () => ({
  SlidersHorizontal: () => <span aria-hidden="true" />,
}))

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}))

import { ListingLayout } from "../listing-layout"

describe("ListingLayout", () => {
  it("uses a single-column grid when there is no sidebar", () => {
    render(
      <ListingLayout header={<h1>Bundles</h1>}>
        <section>Bundle content</section>
      </ListingLayout>
    )

    const content = screen.getByText("Bundle content")
    const grid = content.parentElement?.parentElement

    expect(grid).toHaveClass("grid-cols-1")
    expect(grid).not.toHaveClass("lg:grid-cols-[250px_1fr]")
  })

  it("uses the sidebar grid and mobile disclosure when a sidebar is present", () => {
    render(
      <ListingLayout sidebar={<div>Filters</div>}>
        <section>Product content</section>
      </ListingLayout>
    )

    const content = screen.getByText("Product content")
    const grid = content.parentElement?.parentElement

    expect(grid).toHaveClass("grid-cols-1")
    expect(grid).toHaveClass("lg:grid-cols-[250px_1fr]")
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument()
  })
})
