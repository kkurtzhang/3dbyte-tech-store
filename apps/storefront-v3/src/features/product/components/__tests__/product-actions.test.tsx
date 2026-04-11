import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProductActions } from "../product-actions"
import type { MedusaProduct, MedusaProductVariant } from "@/lib/medusa/types"

const addItem = jest.fn()
const toast = jest.fn()
const setOptions = jest.fn()
const onVariantChange = jest.fn()
const priceDisplayMock = jest.fn()

jest.mock("@/context/cart-context", () => ({
  useCart: () => ({ addItem }),
}))

jest.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}))

jest.mock("next/navigation", () => ({
  usePathname: () => "/products/test-product",
}))

jest.mock("../social-share", () => ({
  SocialShare: () => <div data-testid="social-share" />,
}))

jest.mock("@/components/ui/price-display", () => ({
  PriceDisplay: (props: unknown) => {
    priceDisplayMock(props)
    return <div data-testid="price-display" />
  },
}))

jest.mock("@/components/ui/size-guide", () => ({
  SizeGuideButton: () => <button>Size Guide</button>,
  shouldShowSizeGuide: () => ({ shouldShow: false }),
}))

jest.mock("@/components/ui/stock-status-badge", () => ({
  StockStatusBadge: () => <div data-testid="stock-status-badge" />,
  getStockStatus: () => ({ status: "preorder", quantity: 0 }),
}))

jest.mock("../notify-me-button", () => ({
  NotifyMeButton: () => <button>Notify Me</button>,
}))

jest.mock("lucide-react", () => ({
  CheckCircle2: () => <span />,
  AlertTriangle: () => <span />,
  XCircle: () => <span />,
}))

const createVariant = (overrides: Partial<MedusaProductVariant> = {}): MedusaProductVariant =>
  ({
    id: "variant_1",
    title: "Default Variant",
    inventory_quantity: 0,
    manage_inventory: true,
    preorder_variant: {
      status: "enabled",
      available_date: "2999-01-01T00:00:00.000Z",
      prices: [{ amount: 80, currency_code: "usd" }],
    },
    prices: [{ amount: 100, currency_code: "usd" }],
    options: [],
    ...overrides,
  }) as MedusaProductVariant

const product = {
  id: "prod_1",
  title: "Pre-order Product",
  description: "A product that can be pre-ordered.",
  variants: [createVariant()],
  options: [],
  thumbnail: "/product.jpg",
} as unknown as MedusaProduct

describe("ProductActions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("shows preorder call-to-action for preorder variants", () => {
    render(
      <ProductActions
        product={product}
        selectedVariant={product.variants?.[0]}
        onVariantChange={onVariantChange}
        options={{}}
        setOptions={setOptions}
      />
    )

    expect(screen.getByRole("button", { name: /pre-order now/i })).toBeEnabled()
    expect(screen.queryByText("Notify Me")).not.toBeInTheDocument()
  })

  it("adds preorder variants to cart", async () => {
    const user = userEvent.setup()

    render(
      <ProductActions
        product={product}
        selectedVariant={product.variants?.[0]}
        onVariantChange={onVariantChange}
        options={{}}
        setOptions={setOptions}
      />
    )

    await user.click(screen.getByRole("button", { name: /pre-order now/i }))

    expect(addItem).toHaveBeenCalledWith("variant_1", 1)
  })

  it("passes preorder pricing to the price display", () => {
    render(
      <ProductActions
        product={product}
        selectedVariant={product.variants?.[0]}
        onVariantChange={onVariantChange}
        options={{}}
        setOptions={setOptions}
      />
    )

    expect(priceDisplayMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Pre-order price",
        price: { amount: 80, currency_code: "usd" },
        size: "lg",
      })
    )
  })

  it("shows preorder availability separately from the stock badge", () => {
    render(
      <ProductActions
        product={product}
        selectedVariant={product.variants?.[0]}
        onVariantChange={onVariantChange}
        options={{}}
        setOptions={setOptions}
      />
    )

    expect(screen.getByText(/Available on/i)).toBeInTheDocument()
  })
})
