import { render, screen } from "@testing-library/react"

import { ProductBreadcrumbs } from "../product-breadcrumbs"

jest.mock("lucide-react", () => ({
  ChevronLeft: () => <span data-testid="chevron-left" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
}))

describe("ProductBreadcrumbs", () => {
  it("renders a single breadcrumb trail without a duplicate back link", () => {
    render(
      <ProductBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Polymaker", href: "/brands/polymaker" },
          { label: "PETG Black" },
        ]}
        sourceContext={{ label: "Polymaker", href: "/brands/polymaker" }}
      />
    )

    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Polymaker" })).toHaveAttribute(
      "href",
      "/brands/polymaker"
    )
    expect(screen.queryByRole("link", { name: /back to polymaker/i })).not.toBeInTheDocument()
  })
})
