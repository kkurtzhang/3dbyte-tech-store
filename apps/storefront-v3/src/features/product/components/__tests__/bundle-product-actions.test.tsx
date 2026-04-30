import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { BundleProduct } from "@/lib/medusa/bundles"
import type { MedusaProduct } from "@/lib/medusa/types"
import { BundleProductActions } from "../bundle-product-actions"

const addBundle = jest.fn()
const toast = jest.fn()
const priceDisplayMock = jest.fn()

jest.mock("@/context/cart-context", () => ({
  useCart: () => ({ addBundle }),
}))

jest.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}))

jest.mock("@/components/ui/price-display", () => ({
  PriceDisplay: (props: unknown) => {
    priceDisplayMock(props)
    return <div data-testid="price-display" />
  },
}))

jest.mock("../social-share", () => ({
  SocialShare: () => <div data-testid="social-share" />,
}))

jest.mock("../product-shipping-estimate", () => ({
  ProductShippingEstimate: ({
    items,
  }: {
    items?: { variantId: string; quantity: number }[]
  }) => (
    <div data-testid="product-shipping-estimate">
      {items?.map((item) => `${item.variantId}:${item.quantity}`).join(",")}
    </div>
  ),
}))

jest.mock("lucide-react", () => ({
  AlertTriangle: () => <svg data-testid="icon-alert-triangle" />,
  CheckCircle2: () => <svg data-testid="icon-check-circle" />,
  XCircle: () => <svg data-testid="icon-x-circle" />,
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href}>{children}</a>,
}))

describe("BundleProductActions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("prefers calculated price currency over the first listed price currency", () => {
    const product = {
      id: "prod_bundle",
      title: "Starter Bundle",
      handle: "starter-bundle",
      variants: [
        {
          id: "variant_bundle",
          title: "Default",
          prices: [
            { amount: 78, currency_code: "nzd" },
            { amount: 75, currency_code: "aud" },
          ],
          calculated_price: {
            calculated_amount: 75,
            original_amount: 75,
            currency_code: "aud",
          },
          options: [],
        },
      ],
      options: [],
    } as unknown as MedusaProduct

    const bundleProduct = {
      id: "bundle_123",
      title: "Starter Bundle",
      product,
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: {
            id: "prod_child",
            title: "Part A",
            handle: "part-a",
            variants: [
              {
                id: "variant_child",
                title: "Default",
                options: [],
                prices: [{ amount: 75, currency_code: "aud" }],
                calculated_price: {
                  calculated_amount: 75,
                  original_amount: 75,
                  currency_code: "aud",
                },
              },
            ],
            options: [],
          } as unknown as MedusaProduct,
        },
      ],
    } as BundleProduct

    render(<BundleProductActions product={product} bundleProduct={bundleProduct} />)

    expect(screen.getByTestId("price-display")).toBeInTheDocument()
    expect(priceDisplayMock).toHaveBeenCalledWith(
      expect.objectContaining({
        price: {
          amount: 75,
          currency_code: "aud",
        },
      })
    )
  })

  it("renders item titles as product links, shows per-item bundle pricing, and hides default-only variant UI", () => {
    const product = {
      id: "prod_bundle",
      title: "Starter Bundle",
      handle: "starter-bundle",
      variants: [
        {
          id: "variant_bundle",
          title: "Default",
          prices: [{ amount: 79, currency_code: "aud" }],
          calculated_price: {
            calculated_amount: 79,
            original_amount: 79,
            currency_code: "aud",
          },
          options: [],
        },
      ],
      options: [],
    } as unknown as MedusaProduct

    const bundleProduct = {
      id: "bundle_123",
      title: "Starter Bundle",
      product,
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: {
            id: "prod_child",
            title: "Part A",
            handle: "part-a",
            variants: [
              {
                id: "variant_child",
                title: "Default Title",
                prices: [{ amount: 99, currency_code: "aud" }],
                options: [
                  {
                    id: "optval_default",
                    option_id: "opt_default",
                    value: "Default",
                  },
                ],
              },
            ],
            options: [
              {
                id: "opt_default",
                title: "Default",
                values: [
                  {
                    id: "optval_default",
                    option_id: "opt_default",
                    value: "Default",
                  },
                ],
              },
            ],
          } as unknown as MedusaProduct,
        },
      ],
    } as BundleProduct

    render(<BundleProductActions product={product} bundleProduct={bundleProduct} />)

    expect(screen.getByRole("link", { name: "Part A" })).toHaveAttribute(
      "href",
      "/products/part-a"
    )
    expect(screen.queryByRole("link", { name: /open product/i })).not.toBeInTheDocument()
    expect(screen.getByText("Standalone")).toBeInTheDocument()
    expect(screen.getByText("In bundle")).toBeInTheDocument()
    expect(screen.getByText("You save")).toBeInTheDocument()
    expect(screen.queryByText(/Selected variant:/i)).not.toBeInTheDocument()
    expect(screen.queryByText("Default")).not.toBeInTheDocument()
  })

  it("updates the bundle total when a more expensive variant is selected", () => {
    const product = {
      id: "prod_bundle",
      title: "Starter Bundle",
      handle: "starter-bundle",
      variants: [
        {
          id: "variant_bundle",
          title: "Default",
          prices: [{ amount: 75, currency_code: "aud" }],
          calculated_price: {
            calculated_amount: 75,
            original_amount: 75,
            currency_code: "aud",
          },
          options: [],
        },
      ],
      options: [],
    } as unknown as MedusaProduct

    const bundleProduct = {
      id: "bundle_123",
      title: "Starter Bundle",
      product,
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: {
            id: "prod_child",
            title: "Part A",
            handle: "part-a",
            variants: [
              {
                id: "variant_default",
                title: "Standard",
                prices: [{ amount: 50, currency_code: "aud" }],
                calculated_price: {
                  calculated_amount: 50,
                  original_amount: 50,
                  currency_code: "aud",
                },
                options: [
                  {
                    id: "optval_standard",
                    option_id: "opt_finish",
                    value: "Standard",
                  },
                ],
              },
              {
                id: "variant_premium",
                title: "Premium",
                prices: [{ amount: 70, currency_code: "aud" }],
                calculated_price: {
                  calculated_amount: 70,
                  original_amount: 70,
                  currency_code: "aud",
                },
                options: [
                  {
                    id: "optval_premium",
                    option_id: "opt_finish",
                    value: "Premium",
                  },
                ],
              },
            ],
            options: [
              {
                id: "opt_finish",
                title: "Finish",
                values: [
                  {
                    id: "optval_standard",
                    option_id: "opt_finish",
                    value: "Standard",
                  },
                  {
                    id: "optval_premium",
                    option_id: "opt_finish",
                    value: "Premium",
                  },
                ],
              },
            ],
          } as unknown as MedusaProduct,
        },
        {
          id: "item_2",
          quantity: 1,
          product: {
            id: "prod_child_2",
            title: "Part B",
            handle: "part-b",
            variants: [
              {
                id: "variant_regular",
                title: "Regular",
                prices: [{ amount: 40, currency_code: "aud" }],
                calculated_price: {
                  calculated_amount: 40,
                  original_amount: 40,
                  currency_code: "aud",
                },
                options: [],
              },
            ],
            options: [],
          } as unknown as MedusaProduct,
        },
      ],
    } as BundleProduct

    render(<BundleProductActions product={product} bundleProduct={bundleProduct} />)

    expect(priceDisplayMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        price: {
          amount: 75,
          currency_code: "aud",
        },
        originalPrice: 90,
        discountPercentage: 17,
      })
    )

    fireEvent.click(screen.getByRole("button", { name: "Premium" }))

    expect(priceDisplayMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        price: {
          amount: 95,
          currency_code: "aud",
        },
        originalPrice: 110,
        discountPercentage: 14,
      })
    )
  })

  it("shows a bundle quantity selector next to the add-to-cart action", async () => {
    const user = userEvent.setup()
    const product = {
      id: "prod_bundle",
      title: "Starter Bundle",
      handle: "starter-bundle",
      variants: [
        {
          id: "variant_bundle",
          title: "Default",
          prices: [{ amount: 75, currency_code: "aud" }],
          calculated_price: {
            calculated_amount: 75,
            original_amount: 75,
            currency_code: "aud",
          },
          options: [],
        },
      ],
      options: [],
    } as unknown as MedusaProduct

    const bundleProduct = {
      id: "bundle_123",
      title: "Starter Bundle",
      product,
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: {
            id: "prod_child",
            title: "Part A",
            handle: "part-a",
            variants: [
              {
                id: "variant_default",
                title: "Standard",
                inventory_quantity: 8,
                manage_inventory: true,
                allow_backorder: false,
                prices: [{ amount: 50, currency_code: "aud" }],
                options: [],
              },
            ],
            options: [],
          } as unknown as MedusaProduct,
        },
      ],
    } as BundleProduct

    render(<BundleProductActions product={product} bundleProduct={bundleProduct} />)

    expect(screen.getByRole("button", { name: /decrease bundle quantity/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /increase bundle quantity/i })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /increase bundle quantity/i }))
    await user.click(screen.getByRole("button", { name: /add bundle to cart/i }))

    expect(addBundle).toHaveBeenCalledWith(
      "bundle_123",
      2,
      [
        {
          item_id: "item_1",
          variant_id: "variant_default",
        },
      ]
    )
  })

  it("shows bundle stock from selected child variants and blocks out-of-stock bundles", () => {
    const product = {
      id: "prod_bundle",
      title: "Starter Bundle",
      handle: "starter-bundle",
      variants: [
        {
          id: "variant_bundle",
          title: "Default",
          prices: [{ amount: 75, currency_code: "aud" }],
          calculated_price: {
            calculated_amount: 75,
            original_amount: 75,
            currency_code: "aud",
          },
          options: [],
        },
      ],
      options: [],
    } as unknown as MedusaProduct

    const bundleProduct = {
      id: "bundle_123",
      title: "Starter Bundle",
      product,
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: {
            id: "prod_child",
            title: "Part A",
            handle: "part-a",
            variants: [
              {
                id: "variant_default",
                title: "Standard",
                inventory_quantity: 3,
                manage_inventory: true,
                allow_backorder: false,
                prices: [{ amount: 50, currency_code: "aud" }],
                options: [
                  {
                    id: "optval_standard",
                    option_id: "opt_finish",
                    value: "Standard",
                  },
                ],
              },
              {
                id: "variant_oos",
                title: "Limited",
                inventory_quantity: 0,
                manage_inventory: true,
                allow_backorder: false,
                prices: [{ amount: 55, currency_code: "aud" }],
                options: [
                  {
                    id: "optval_limited",
                    option_id: "opt_finish",
                    value: "Limited",
                  },
                ],
              },
            ],
            options: [
              {
                id: "opt_finish",
                title: "Finish",
                values: [
                  {
                    id: "optval_standard",
                    option_id: "opt_finish",
                    value: "Standard",
                  },
                  {
                    id: "optval_limited",
                    option_id: "opt_finish",
                    value: "Limited",
                  },
                ],
              },
            ],
          } as unknown as MedusaProduct,
        },
      ],
    } as BundleProduct

    render(<BundleProductActions product={product} bundleProduct={bundleProduct} />)

    expect(screen.getByText("Low Stock")).toBeInTheDocument()
    expect(screen.queryByText(/\(3 bundles left\)/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/available with the current selection/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add bundle to cart/i })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: "Limited" }))

    expect(screen.getAllByText("Out of Stock")).toHaveLength(2)
    expect(
      screen.getByText(/this bundle is unavailable with the current variant selection/i)
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /out of stock/i })).toBeDisabled()
  })

  it("does not treat bundle component backorders as in stock", () => {
    const product = {
      id: "prod_bundle",
      title: "Starter Bundle",
      handle: "starter-bundle",
      variants: [
        {
          id: "variant_bundle",
          title: "Default",
          prices: [{ amount: 75, currency_code: "aud" }],
          calculated_price: {
            calculated_amount: 75,
            original_amount: 75,
            currency_code: "aud",
          },
          options: [],
        },
      ],
      options: [],
    } as unknown as MedusaProduct

    const bundleProduct = {
      id: "bundle_123",
      title: "Starter Bundle",
      product,
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: {
            id: "prod_child",
            title: "Part A",
            handle: "part-a",
            variants: [
              {
                id: "variant_backorder",
                title: "Standard",
                inventory_quantity: null,
                manage_inventory: true,
                allow_backorder: true,
                prices: [{ amount: 50, currency_code: "aud" }],
                options: [],
              },
            ],
            options: [],
          } as unknown as MedusaProduct,
        },
      ],
    } as BundleProduct

    render(<BundleProductActions product={product} bundleProduct={bundleProduct} />)

    expect(screen.getAllByText("Out of Stock")).toHaveLength(2)
    expect(
      screen.getByText(/this bundle is unavailable with the current variant selection/i)
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /out of stock/i })).toBeDisabled()
  })

  it("prefers an in-stock variant for the initial bundle selection", () => {
    const product = {
      id: "prod_bundle",
      title: "Starter Bundle",
      handle: "starter-bundle",
      variants: [
        {
          id: "variant_bundle",
          title: "Default",
          prices: [{ amount: 75, currency_code: "aud" }],
          calculated_price: {
            calculated_amount: 75,
            original_amount: 75,
            currency_code: "aud",
          },
          options: [],
        },
      ],
      options: [],
    } as unknown as MedusaProduct

    const bundleProduct = {
      id: "bundle_123",
      title: "Starter Bundle",
      product,
      items: [
        {
          id: "item_1",
          quantity: 1,
          product: {
            id: "prod_child",
            title: "Part A",
            handle: "part-a",
            variants: [
              {
                id: "variant_oos",
                title: "Black",
                inventory_quantity: 0,
                manage_inventory: true,
                allow_backorder: false,
                prices: [{ amount: 50, currency_code: "aud" }],
                options: [
                  {
                    id: "optval_black",
                    option_id: "opt_finish",
                    value: "Black",
                  },
                ],
              },
              {
                id: "variant_in_stock",
                title: "Orange",
                inventory_quantity: 6,
                manage_inventory: true,
                allow_backorder: false,
                prices: [{ amount: 50, currency_code: "aud" }],
                options: [
                  {
                    id: "optval_orange",
                    option_id: "opt_finish",
                    value: "Orange",
                  },
                ],
              },
            ],
            options: [
              {
                id: "opt_finish",
                title: "Finish",
                values: [
                  {
                    id: "optval_black",
                    option_id: "opt_finish",
                    value: "Black",
                  },
                  {
                    id: "optval_orange",
                    option_id: "opt_finish",
                    value: "Orange",
                  },
                ],
              },
            ],
          } as unknown as MedusaProduct,
        },
      ],
    } as BundleProduct

    render(<BundleProductActions product={product} bundleProduct={bundleProduct} />)

    expect(screen.getByText("In Stock")).toBeInTheDocument()
    expect(screen.queryByText(/\(6 bundles left\)/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\(6 bundles available\)/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/available with the current selection/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/this bundle is unavailable with the current variant selection/i)
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add bundle to cart/i })).toBeEnabled()
  })
})
