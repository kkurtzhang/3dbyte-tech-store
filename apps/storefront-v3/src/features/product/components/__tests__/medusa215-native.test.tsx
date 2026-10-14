import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { MedusaCart } from "@/lib/medusa/cart"
import type { MedusaProduct } from "@/lib/medusa/types"
import type { BundleProduct } from "@/lib/medusa/bundles"
import { getBundleLink } from "@/lib/medusa/bundles"
import { analyzeCartContents } from "@/lib/util/cart-analysis"
import { ProductActions } from "../product-actions"
import { CartItem } from "@/features/cart/components/cart-item"
import { CheckoutSummary } from "@/features/checkout/components/checkout-summary"

const mockAddBundle = jest.fn()
const mockAddItem = jest.fn()
jest.mock("@/context/cart-context", () => ({
  useCart: () => ({
    cart: null,
    isLoading: false,
    refreshCart: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    addItem: mockAddItem,
    addBundle: mockAddBundle,
  }),
}))
jest.mock("@/context/saved-items-context", () => ({
  useSavedItems: () => ({ saveItem: jest.fn(), isSaved: () => false }),
}))
jest.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}))
jest.mock("next/navigation", () => ({
  usePathname: () => "/products/synthetic-contract-product",
}))
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}))
jest.mock("../social-share", () => ({ SocialShare: () => null }))
jest.mock("../product-shipping-estimate", () => ({
  ProductShippingEstimate: () => null,
}))
jest.mock("../product-wishlist-button", () => ({
  ProductWishlistButton: () => null,
}))
jest.mock("../notify-me-button", () => ({
  NotifyMeButton: () => <button>Notify Me</button>,
}))
jest.mock("@/components/ui/payment-method-support", () => ({
  PaymentMethodSupport: () => null,
}))
jest.mock("@/components/ui/size-guide", () => ({
  SizeGuideButton: () => null,
  shouldShowSizeGuide: () => ({ shouldShow: false }),
}))
jest.mock("lucide-react", () => ({
  Minus: () => <span />,
  Plus: () => <span />,
  Trash2: () => <span />,
  Bookmark: () => <span />,
  ImageOff: () => <span />,
  CheckCircle2: () => <span />,
  AlertTriangle: () => <span />,
  XCircle: () => <span />,
  Flame: () => <span />,
}))

const resultPath = process.env.MEDUSA215_RUNTIME_RESULT
const runtimeDescribe = resultPath ? describe : describe.skip
runtimeDescribe(
  "retained Medusa 2.15 bundle/preorder behavior with native fixture responses",
  () => {
    let fixture: {
      fixtureOnly: boolean
      product: MedusaProduct
      bundleProduct: MedusaProduct
      bundle: BundleProduct
      cart: MedusaCart
      bundleCart: MedusaCart
      bundleListing: MedusaProduct[]
    }
    beforeAll(() => {
      fixture = JSON.parse(readFileSync(resultPath!, "utf8"))
      expect(fixture.fixtureOnly).toBe(true)
    })
    beforeEach(() => jest.clearAllMocks())
    it("retains preorder actions, the configured price and availability", async () => {
      render(
        <ProductActions
          product={fixture.product}
          selectedVariant={fixture.product.variants?.[0]}
          onVariantChange={jest.fn()}
          options={{}}
          setOptions={jest.fn()}
        />,
      )
      expect(
        screen.getByRole("button", { name: /pre-order now/i }),
      ).toBeEnabled()
      expect(screen.getByText("$80.00")).toBeInTheDocument()
      expect(screen.getByText(/Jan 1, 2999/)).toBeInTheDocument()
      expect(screen.queryByText("Notify Me")).not.toBeInTheDocument()
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: /pre-order now/i }))
      expect(mockAddItem).toHaveBeenCalledWith(
        fixture.product.variants![0].id,
        1,
      )
    })
    it("keeps the native preorder cart's charged and regular prices", () => {
      expect(fixture.cart.items![0].variant).toHaveProperty(
        "preorder_variant.status",
        "enabled",
      )
      render(<CartItem item={fixture.cart.items![0]} currencyCode="usd" />)
      expect(screen.getByText(/Pre-order available on/i)).toBeInTheDocument()
      expect(screen.getByText("$80.00")).toBeInTheDocument()
      expect(screen.getByText("$120.00")).toHaveClass("line-through")
      expect(screen.getByText("$160.00")).toBeInTheDocument()
    })
    it("retains preorder checkout notices and charged totals", () => {
      render(<CheckoutSummary cart={fixture.cart} />)
      expect(screen.getByText(/Pre-order available on/i)).toBeInTheDocument()
      expect(
        screen.getByText(/Pre-order items ship when available/i),
      ).toBeInTheDocument()
      expect(screen.getAllByText("$160.00").length).toBeGreaterThan(0)
    })
    it("retains bundle discovery, selection and cart grouping", async () => {
      expect(getBundleLink(fixture.bundleProduct)?.id).toBe(fixture.bundle.id)
      expect(
        fixture.bundleListing.filter((p) => getBundleLink(p) !== null),
      ).toHaveLength(1)
      const analysis = analyzeCartContents(fixture.bundleCart.items, "usd")
      expect(analysis.bundleGroups).toHaveLength(1)
      expect(analysis.bundleSavingsTotal).toBe(80)
      render(
        <ProductActions
          product={fixture.bundleProduct}
          bundleProduct={fixture.bundle}
          selectedVariant={fixture.bundleProduct.variants?.[0]}
          onVariantChange={jest.fn()}
          options={{}}
          setOptions={jest.fn()}
        />,
      )
      const button = screen.getByRole("button", { name: /Add Bundle to Cart/i })
      expect(button).toBeEnabled()
      expect(screen.getAllByText("$160.00").length).toBeGreaterThan(0)
      await userEvent.setup().click(button)
      expect(mockAddBundle).toHaveBeenCalledWith(fixture.bundle.id, 1, [
        {
          item_id: fixture.bundle.items[0].id,
          variant_id: fixture.bundle.items[0].product.variants![0].id,
        },
      ])
    })
  },
)
