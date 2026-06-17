import { render, screen, within } from "@testing-library/react"

import { ListingPagination } from "../listing-pagination"

jest.mock("lucide-react", () => ({
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
}))

describe("ListingPagination", () => {
  it("summarizes the visible range and collapses long page sets", () => {
    render(
      <ListingPagination
        buildHref={(page) => (page > 1 ? `/shop?page=${page}` : "/shop")}
        currentPage={5}
        pageSize={20}
        totalItems={184}
      />
    )

    expect(screen.getByText("Showing 81-100 of 184 products")).toBeInTheDocument()

    const navigation = screen.getByRole("navigation", { name: "Product pagination" })
    expect(within(navigation).getByRole("link", { name: "Previous page" })).toHaveAttribute(
      "href",
      "/shop?page=4"
    )
    expect(within(navigation).getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/shop?page=6"
    )
    expect(within(navigation).getByRole("link", { name: "Page 1" })).toHaveAttribute(
      "href",
      "/shop"
    )
    expect(within(navigation).getByRole("link", { name: "Page 5" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(within(navigation).getByRole("link", { name: "Page 10" })).toHaveAttribute(
      "href",
      "/shop?page=10"
    )
    expect(within(navigation).queryByRole("link", { name: "Page 2" })).not.toBeInTheDocument()
    expect(within(navigation).getAllByText("...")).toHaveLength(2)
  })

  it("shows disabled edge controls on the first page", () => {
    render(
      <ListingPagination
        buildHref={(page) => `/categories/filament?page=${page}`}
        currentPage={1}
        pageSize={20}
        totalItems={24}
      />
    )

    expect(screen.getByText("Showing 1-20 of 24 products")).toBeInTheDocument()

    const navigation = screen.getByRole("navigation", { name: "Product pagination" })
    expect(within(navigation).getByLabelText("Previous page")).toHaveAttribute("aria-disabled", "true")
    expect(within(navigation).getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/categories/filament?page=2"
    )
  })
})
