import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import type { MedusaProduct } from "@/lib/medusa/types"
import { AvailableInBundles } from "../available-in-bundles"

const addItem = jest.fn()
const toast = jest.fn()

jest.mock("@/context/cart-context", () => ({
  useCart: () => ({ addItem }),
}))

jest.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}))

jest.mock("lucide-react", () => ({
  Check: () => null,
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const currentProduct = {
  id: "prod_printer",
  title: "Printer",
  handle: "printer",
  variants: [
    {
      id: "variant_standard",
      title: "Standard",
      prices: [{ amount: 99, currency_code: "AUD" }],
      calculated_price: {
        calculated_amount: 99,
        original_amount: 99,
        currency_code: "AUD",
      },
    },
    {
      id: "variant_premium",
      title: "Premium",
      prices: [{ amount: 129, currency_code: "AUD" }],
      calculated_price: {
        calculated_amount: 129,
        original_amount: 129,
        currency_code: "AUD",
      },
    },
  ],
  options: [],
} as unknown as MedusaProduct

describe("AvailableInBundles", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    addItem.mockResolvedValue(undefined)
  })

  it("renders nothing when no bundles are provided", () => {
    const { container } = render(
      <AvailableInBundles bundles={[]} product={currentProduct} />
    )

    expect(container.firstChild).toBeNull()
  })

  it("renders linked bundle cards near the buy box", () => {
    render(
      <AvailableInBundles
        product={currentProduct}
        bundles={[
          {
            id: "bundle_123",
            title: "Starter Bundle",
            product: {
              variants: [
                {
                  prices: [{ amount: 149, currency_code: "AUD" }],
                  calculated_price: {
                    calculated_amount: 149,
                    original_amount: 199,
                    currency_code: "AUD",
                  },
                },
              ],
              handle: "starter-bundle",
              title: "Starter Bundle",
            },
            items: [
              {
                id: "item_1",
                quantity: 1,
                product: currentProduct,
              },
              {
                id: "item_2",
                quantity: 2,
                product: {
                  id: "prod_filament",
                  title: "Filament Spool With A Longer Accessory Name",
                  handle: "filament-spool",
                  variants: [
                    { prices: [{ amount: 40, currency_code: "AUD" }] },
                  ],
                },
              },
            ] as never[],
          },
        ]}
      />
    )

    expect(screen.getByText("Available in Bundles")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /starter bundle/i })
    ).toHaveAttribute("href", "/bundles/starter-bundle")
    expect(screen.getByText("Save 17%")).toBeInTheDocument()
    expect(screen.getByText("From")).toBeInTheDocument()
    expect(screen.getByText(/\$149\.00/)).toBeInTheDocument()
    expect(screen.getByText(/\$179\.00/)).toBeInTheDocument()
    expect(screen.getByText("2 items")).toBeInTheDocument()
    expect(screen.getByText("Also includes")).toBeInTheDocument()
    expect(screen.getByText("2 x")).toBeInTheDocument()
    expect(
      screen.getByRole("link", {
        name: "Filament Spool With A Longer Accessory Name",
      })
    ).toHaveAttribute("href", "/products/filament-spool")
    expect(screen.queryByText(/1 x Printer/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: /view bundle/i })
    ).not.toBeInTheDocument()
  })

  it("updates bundle savings when the current product variant changes", () => {
    render(
      <AvailableInBundles
        product={currentProduct}
        selectedVariant={currentProduct.variants?.[1]}
        bundles={[
          {
            id: "bundle_123",
            title: "Starter Bundle",
            product: {
              variants: [
                {
                  prices: [{ amount: 119, currency_code: "AUD" }],
                  calculated_price: {
                    calculated_amount: 119,
                    original_amount: 119,
                    currency_code: "AUD",
                  },
                },
              ],
              handle: "starter-bundle",
              title: "Starter Bundle",
            },
            items: [
              {
                id: "item_1",
                quantity: 1,
                product: currentProduct,
              },
              {
                id: "item_2",
                quantity: 1,
                product: {
                  id: "prod_part_b",
                  title: "Part B",
                  variants: [
                    { prices: [{ amount: 40, currency_code: "AUD" }] },
                  ],
                },
              },
            ] as never[],
          },
        ]}
      />
    )

    expect(screen.getByText(/\$149\.00/)).toBeInTheDocument()
    expect(screen.getByText("Save 12%")).toBeInTheDocument()
    expect(screen.getByText(/\$169\.00/)).toBeInTheDocument()
  })

  it("hides the savings badge when the bundle is not cheaper than separate items", () => {
    render(
      <AvailableInBundles
        product={currentProduct}
        bundles={[
          {
            id: "bundle_flat",
            title: "No Savings Bundle",
            product: {
              handle: "no-savings-bundle",
              title: "No Savings Bundle",
              variants: [{ prices: [{ amount: 139, currency_code: "AUD" }] }],
            },
            items: [
              {
                id: "item_1",
                quantity: 1,
                product: currentProduct,
              },
              {
                id: "item_2",
                quantity: 1,
                product: {
                  id: "prod_part_b",
                  title: "Part B",
                  variants: [
                    { prices: [{ amount: 40, currency_code: "AUD" }] },
                  ],
                },
              },
            ] as never[],
          },
        ]}
      />
    )

    expect(screen.getByText("From")).toBeInTheDocument()
    expect(screen.getByText(/\$139\.00/)).toBeInTheDocument()
    expect(screen.queryByText(/Save \d+%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\$139\.00/)).toBeInTheDocument()
  })

  it("sorts bundles by highest savings before rendering", () => {
    render(
      <AvailableInBundles
        product={currentProduct}
        bundles={[
          {
            id: "bundle_low",
            title: "Lower Savings Bundle",
            product: {
              handle: "lower-savings-bundle",
              title: "Lower Savings Bundle",
              variants: [{ prices: [{ amount: 180, currency_code: "AUD" }] }],
            },
            items: [
              {
                id: "item_1",
                quantity: 1,
                product: currentProduct,
              },
              {
                id: "item_2",
                quantity: 1,
                product: {
                  id: "prod_part_b",
                  title: "Part B",
                  variants: [
                    { prices: [{ amount: 100, currency_code: "AUD" }] },
                  ],
                },
              },
            ] as never[],
          },
          {
            id: "bundle_high",
            title: "Higher Savings Bundle",
            product: {
              handle: "higher-savings-bundle",
              title: "Higher Savings Bundle",
              variants: [{ prices: [{ amount: 120, currency_code: "AUD" }] }],
            },
            items: [
              {
                id: "item_1",
                quantity: 1,
                product: currentProduct,
              },
              {
                id: "item_2",
                quantity: 1,
                product: {
                  id: "prod_part_b",
                  title: "Part B",
                  variants: [
                    { prices: [{ amount: 100, currency_code: "AUD" }] },
                  ],
                },
              },
            ] as never[],
          },
        ]}
      />
    )

    const links = screen.getAllByRole("link", { name: /bundle/i })
    expect(links[0]).toHaveTextContent("Higher Savings Bundle")
  })

  it("adds the current product and selected build add-ons as regular cart items", async () => {
    const user = userEvent.setup()

    render(
      <AvailableInBundles
        product={currentProduct}
        selectedVariant={currentProduct.variants?.[1]}
        bundles={[
          {
            id: "bundle_123",
            title: "Starter Bundle",
            product: {
              handle: "starter-bundle",
              title: "Starter Bundle",
              variants: [{ prices: [{ amount: 149, currency_code: "AUD" }] }],
            },
            items: [
              {
                id: "item_1",
                quantity: 1,
                product: currentProduct,
              },
              {
                id: "item_fasteners",
                quantity: 2,
                product: {
                  id: "prod_fasteners",
                  title: "Fastener Kit",
                  handle: "fastener-kit",
                  variants: [
                    {
                      id: "variant_fasteners",
                      prices: [{ amount: 25, currency_code: "AUD" }],
                    },
                  ],
                },
              },
            ] as never[],
          },
        ]}
      />
    )

    expect(
      screen.getByRole("heading", { name: /complete your build/i })
    ).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /printer/i })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: /printer/i })).toBeDisabled()

    const fastenerOption = screen.getByRole("checkbox", {
      name: /fastener kit/i,
    })
    expect(fastenerOption).not.toBeChecked()

    await user.click(fastenerOption)
    await user.click(
      screen.getByRole("button", { name: /add selected build items/i })
    )

    expect(addItem).toHaveBeenNthCalledWith(1, "variant_premium", 1)
    expect(addItem).toHaveBeenNthCalledWith(2, "variant_fasteners", 2)
    expect(toast).toHaveBeenCalledWith({
      title: "Build items added",
      description: "2 build items have been added to your cart.",
    })
  })
})
