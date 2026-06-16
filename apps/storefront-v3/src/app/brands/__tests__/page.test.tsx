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

  it("hides brands with an explicit zero product count", async () => {
    mockSearchBrands.mockResolvedValueOnce({
      hits: [
        {
          id: "brand_empty",
          name: "Empty Brand",
          handle: "empty-brand",
          product_count: 0,
        },
        {
          id: "brand_active",
          name: "Active Brand",
          handle: "active-brand",
          product_count: 3,
        },
      ],
      count: 2,
    })
    mockGetBrandDescriptions.mockResolvedValueOnce({ data: [] })

    render(await BrandsPage())

    expect(screen.queryByText("Empty Brand")).not.toBeInTheDocument()
    expect(screen.getByText("Active Brand")).toBeInTheDocument()
  })

  it("keeps brands visible when the product count is unavailable", async () => {
    mockSearchBrands.mockResolvedValueOnce({
      hits: [
        {
          id: "brand_pending",
          name: "Pending Count Brand",
          handle: "pending-count-brand",
        },
      ],
      count: 1,
    })
    mockGetBrandDescriptions.mockResolvedValueOnce({ data: [] })

    render(await BrandsPage())

    expect(screen.getByText("Pending Count Brand")).toBeInTheDocument()
  })
})
