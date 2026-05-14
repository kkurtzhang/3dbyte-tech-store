import { render, screen } from "@testing-library/react"
import NotFound from "../not-found"

jest.mock("@/features/search/components/search-input", () => ({
  SearchInput: () => <input aria-label="Search products" />,
}))

jest.mock("lucide-react", () => ({
  ArrowLeft: () => <svg data-testid="icon-arrow-left" />,
  Home: () => <svg data-testid="icon-home" />,
  Layers: () => <svg data-testid="icon-layers" />,
  Package: () => <svg data-testid="icon-package" />,
  Search: () => <svg data-testid="icon-search" />,
  Store: () => <svg data-testid="icon-store" />,
  Tags: () => <svg data-testid="icon-tags" />,
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

describe("NotFound", () => {
  it("links shoppers to launched routes instead of dead catalog placeholders", () => {
    render(<NotFound />)

    expect(screen.getByRole("link", { name: /browse products/i })).toHaveAttribute(
      "href",
      "/shop"
    )
    expect(screen.getByRole("link", { name: /all products/i })).toHaveAttribute(
      "href",
      "/shop"
    )

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))

    expect(hrefs).not.toContain("/products")
    expect(hrefs).not.toContain("/categories")
    expect(hrefs).not.toContain("/gift-cards")
    expect(hrefs).not.toContain("/loyalty")
  })
})
