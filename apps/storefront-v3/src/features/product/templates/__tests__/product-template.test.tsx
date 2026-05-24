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

jest.mock("../../components/product-breadcrumbs", () => ({
  ProductBreadcrumbs: () => <div data-testid="product-breadcrumbs" />,
}))

jest.mock("../../components/product-support-panel", () => ({
  ProductSupportPanel: () => <div data-testid="product-support-panel" />,
}))

jest.mock("../../components/product-documents-panel", () => ({
  ProductDocumentsPanel: () => <div data-testid="product-documents-panel" />,
}))

jest.mock("@/components/product/recently-viewed-products", () => ({
  RecentlyViewedProducts: () => <div data-testid="recently-viewed" />,
}))

jest.mock("@/lib/hooks/use-recently-viewed", () => ({
  useRecentlyViewed: () => ({
    addToRecentlyViewed: jest.fn(),
  }),
}))

jest.mock("lucide-react", () => ({
  ChevronLeft: () => <span />,
  ChevronRight: () => <span />,
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

  it("renders product documents when public downloads are available", () => {
    const { getByTestId } = render(
      <ProductTemplate
        product={createProduct()}
        productDocuments={[
          {
            id: "doc_1",
            title: "Manual",
            document_type: "manual",
            product_title: "Test Product",
            product_handle: "test-product",
            medusa_product_id: "prod_1",
            public_download_path: "/store/product-documents/doc_1/download",
          },
        ]}
      />
    )

    expect(getByTestId("product-documents-panel")).toBeInTheDocument()
  })
})
