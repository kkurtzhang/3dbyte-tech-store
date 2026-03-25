import { render } from "@testing-library/react"
import { ProductTemplate } from "../product-template"
import type { MedusaProduct } from "@/lib/medusa/types"

const setVariantIdMock = jest.fn()
const useQueryStateMock = jest.fn()

jest.mock("nuqs", () => ({
  useQueryState: (...args: unknown[]) => useQueryStateMock(...args),
}))

jest.mock("../../components/product-gallery", () => ({
  ProductGallery: () => <div data-testid="product-gallery" />,
}))

jest.mock("../../components/product-actions", () => ({
  ProductActions: () => <div data-testid="product-actions" />,
}))

jest.mock("../../components/spec-sheet", () => ({
  SpecSheet: () => <div data-testid="spec-sheet" />,
}))

jest.mock("@/components/product/recently-viewed-products", () => ({
  RecentlyViewedProducts: () => <div data-testid="recently-viewed" />,
}))

jest.mock("@/lib/hooks/use-recently-viewed", () => ({
  useRecentlyViewed: () => ({
    addToRecentlyViewed: jest.fn(),
  }),
}))

function createProduct(): MedusaProduct {
  return {
    id: "prod_1",
    title: "Test Product",
    variants: [
      {
        id: "variant_1",
        options: [{ option_id: "size", value: "0.4mm" }],
      },
    ],
    options: [
      {
        id: "size",
        title: "Size",
        values: [{ id: "value_1", value: "0.4mm" }],
      },
    ],
  } as MedusaProduct
}

describe("ProductTemplate", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useQueryStateMock.mockReturnValue([null, setVariantIdMock])
  })

  it("uses replace history for variant query state", () => {
    render(<ProductTemplate product={createProduct()} />)

    expect(useQueryStateMock).toHaveBeenCalledWith(
      "variant",
      expect.objectContaining({
        shallow: false,
        history: "replace",
      })
    )
  })
})
