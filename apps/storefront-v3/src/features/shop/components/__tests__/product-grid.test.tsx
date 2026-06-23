import { render, screen } from "@testing-library/react"

import { ProductGrid } from "../product-grid"

jest.mock("@/features/product/components/product-card", () => ({
  ProductCard: ({ thumbnail, title }: { thumbnail: string; title: string }) => (
    <article data-thumbnail={thumbnail}>{title}</article>
  ),
}))

describe("ProductGrid", () => {
  it("uses the product card no-image state instead of a missing placeholder asset", () => {
    render(
      <ProductGrid
        products={[
          {
            id: "prod_1",
            handle: "petg-black",
            title: "PETG Black",
            price: 18,
            currency_code: "aud",
          },
        ]}
      />
    )

    expect(screen.getByText("PETG Black")).toHaveAttribute("data-thumbnail", "")
  })
})
