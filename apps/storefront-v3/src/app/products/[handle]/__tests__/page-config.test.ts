import { readFileSync } from "node:fs"
import path from "node:path"

import { generateMetadata } from "../page"
import { getProductByHandle } from "@/lib/medusa/products"

jest.mock("@/lib/medusa/products", () => ({
  getProductByHandle: jest.fn(),
  getProductHandles: jest.fn(),
}))

jest.mock("@/features/product/templates/product-template", () => ({
  ProductTemplate: () => null,
}))

jest.mock("@/features/product/lib/load-product-page-data", () => ({
  loadProductPageData: jest.fn(),
}))

jest.mock("@/lib/medusa/regions.server", () => ({
  getPricingContext: jest.fn(),
}))

describe("product detail route config", () => {
  it("stays dynamic because pricing reads region cookies", () => {
    const source = readFileSync(path.resolve(__dirname, "../page.tsx"), "utf8")

    expect(source).toContain('export const dynamic = "force-dynamic"')
  })

  it("does not bake the site name into product metadata titles", async () => {
    ;(getProductByHandle as jest.Mock).mockResolvedValue({
      title: "Polymaker PETG Black 1kg",
      description: "Tough PETG filament",
      thumbnail: "https://cdn.example.com/petg.jpg",
    })

    await expect(
      generateMetadata({
        params: Promise.resolve({ handle: "polymaker-petg-black" }),
      })
    ).resolves.toEqual(
      expect.objectContaining({
        title: "Polymaker PETG Black 1kg",
      })
    )
  })
})
