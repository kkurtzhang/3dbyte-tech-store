import { render, screen } from "@testing-library/react"

import BrandsPage from "../page"
import { searchBrands } from "@/lib/search/brands"
import { getBrandDescriptions } from "@/lib/strapi/content"

jest.mock("@/lib/search/brands", () => ({
  searchBrands: jest.fn(),
}))

jest.mock("@/lib/strapi/content", () => ({
  getBrandDescriptions: jest.fn(),
}))

const mockSearchBrands = searchBrands as jest.MockedFunction<typeof searchBrands>
const mockGetBrandDescriptions = getBrandDescriptions as jest.MockedFunction<
  typeof getBrandDescriptions
>

describe("BrandsPage", () => {
  beforeEach(() => {
    mockSearchBrands.mockResolvedValue({
      hits: [
        {
          id: "brand_polymaker",
          name: "Polymaker",
          handle: "polymaker",
          product_count: 2,
        },
      ],
      count: 1,
    })
    mockGetBrandDescriptions.mockResolvedValue({
      data: [
        {
          id: 1,
          medusa_brand_id: "brand_polymaker",
          brand_name: "Polymaker",
          brand_handle: "polymaker",
          seo_description: "Materials tuned for reliable 3D printing.",
          brand_logo: {
            id: 10,
            url: "/uploads/polymaker-logo.png",
            alternativeText: "Polymaker logo",
            width: 320,
            height: 120,
          },
        },
      ],
    })
  })

  it("renders CMS brand logos and product counts on brand cards", async () => {
    render(await BrandsPage())

    expect(screen.getByRole("img", { name: "Polymaker logo" })).toHaveAttribute(
      "src",
      "http://localhost:1337/uploads/polymaker-logo.png"
    )
    expect(screen.getByText("2 products")).toBeInTheDocument()
    expect(
      screen.getByText("Materials tuned for reliable 3D printing.")
    ).toBeInTheDocument()
  })
})
