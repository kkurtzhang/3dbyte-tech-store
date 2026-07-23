import { render, screen } from "@testing-library/react"

import { SearchResults } from "../search-results"

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

jest.mock("@/features/product/components/product-card", () => ({
  ProductCard: ({ title }: { title: string }) => <article>{title}</article>,
}))

jest.mock("@/features/search/actions/search", () => ({
  searchProducts: jest.fn(),
}))

jest.mock("nuqs", () => ({
  useQueryState: (_key: string, options: { defaultValue?: string }) => [
    options.defaultValue ?? "",
    jest.fn(),
  ],
}))

function product(id: string, title: string) {
  return {
    id,
    handle: id,
    title,
    thumbnail: "",
    price: { amount: 10, currency_code: "aud" },
    inventory_quantity: 12,
    in_stock: true,
  }
}

describe("SearchResults", () => {
  it("renders the latest server-filtered hits after search params change", () => {
    const { rerender } = render(
      <SearchResults
        initialQuery="petg"
        initialHits={[
          product("petg", "PETG Filament"),
          product("tool", "PETG Cleanup Tool"),
        ]}
      />,
    )

    expect(screen.getByText("PETG Cleanup Tool")).toBeInTheDocument()

    rerender(
      <SearchResults
        initialQuery="petg"
        initialHits={[product("petg", "PETG Filament")]}
      />,
    )

    expect(screen.getByText("PETG Filament")).toBeInTheDocument()
    expect(screen.queryByText("PETG Cleanup Tool")).not.toBeInTheDocument()
  })

  it("uses document list semantics instead of wrapping interactive cards in options", () => {
    render(
      <SearchResults initialHits={[product("petg", "PETG Filament")]} />,
    )

    expect(screen.getByRole("list", { name: /search results/i })).toBeInTheDocument()
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(screen.queryByRole("option")).not.toBeInTheDocument()
  })
})
