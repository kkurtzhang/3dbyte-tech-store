import { render, screen } from "@testing-library/react"
import type { MedusaCartLineItem } from "@/lib/medusa/cart"
import { CartNotices, getCompactCartNoticeLines } from "../cart-notices"

jest.mock("lucide-react", () => ({
  AlertTriangle: () => <span />,
  Clock3: () => <span />,
  Package: () => <span />,
}))

function createLineItem(overrides: Partial<MedusaCartLineItem> = {}) {
  return {
    id: "line_default",
    title: "Default Item",
    quantity: 1,
    unit_price: 1000,
    metadata: null,
    variant: {
      id: "variant_default",
      title: "Default Variant",
      prices: [{ amount: 1200, currency_code: "usd" }],
      preorder_variant: undefined,
    },
    ...overrides,
  } as MedusaCartLineItem
}

describe("CartNotices", () => {
  it("renders nothing for regular-only carts", () => {
    const { container } = render(
      <CartNotices items={[createLineItem()]} currencyCode="usd" />
    )

    expect(container.firstChild).toBeNull()
  })

  it("shows preorder and mixed-cart notices when needed", () => {
    render(
      <CartNotices
        currencyCode="usd"
        items={[
          createLineItem({
            id: "line_preorder",
            variant: {
              id: "variant_preorder",
              title: "Default Variant",
              prices: [{ amount: 1200, currency_code: "usd" }],
              preorder_variant: {
                status: "enabled",
                available_date: "2999-01-01T00:00:00.000Z",
                prices: [{ amount: 900, currency_code: "usd" }],
              },
            },
          }),
          createLineItem({
            id: "line_regular",
            variant: {
              id: "variant_regular",
              title: "Default Variant",
              prices: [{ amount: 1200, currency_code: "usd" }],
              preorder_variant: undefined,
            },
          }),
        ]}
      />
    )

    expect(screen.queryByText(/Variant selections saved/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Pre-order items ship when available/i)).toBeInTheDocument()
    expect(screen.getByText(/Jan 1, 2999/i)).toBeInTheDocument()
    expect(
      screen.getByText(/contains both in-stock and pre-order items/i)
    ).toBeInTheDocument()
  })

  it("does not render cart notices for variant-only carts", () => {
    render(
      <CartNotices
        currencyCode="usd"
        items={[
          createLineItem({
            id: "line_variant_only",
            subtitle: "Power Tool Green",
            variant_title: "Power Tool Green",
            variant: {
              id: "variant_selected",
              title: "Default Variant",
              prices: [{ amount: 1200, currency_code: "usd" }],
              preorder_variant: undefined,
            },
          }),
        ]}
      />
    )

    expect(screen.queryByText(/Variant selections saved/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/selected variant/i)).not.toBeInTheDocument()
  })

  it("does not return compact variant lines from line-item variant titles", () => {
    const lines = getCompactCartNoticeLines(
      [
        createLineItem({
          id: "line_variant_title",
          variant_title: "Power Tool Green",
          variant: {
            id: "variant_selected",
            title: "Default Variant",
            prices: [{ amount: 1200, currency_code: "usd" }],
            preorder_variant: undefined,
          },
        }),
      ],
      "usd"
    )

    expect(lines).toEqual([])
  })

  it("does not show a variant notice for default variant titles", () => {
    render(<CartNotices items={[createLineItem()]} currencyCode="usd" />)

    expect(screen.queryByText(/Variant selections saved/i)).not.toBeInTheDocument()
  })

  it("returns no compact variant line when only the line-item subtitle is meaningful", () => {
    const lines = getCompactCartNoticeLines(
      [
        createLineItem({
          id: "line_subtitle_variant",
          subtitle: "Power Tool Green",
          variant_title: "Default Title",
          variant: {
            id: "variant_selected",
            title: "Default Variant",
            prices: [{ amount: 1200, currency_code: "usd" }],
            preorder_variant: undefined,
          },
        }),
      ],
      "usd"
    )

    expect(lines).toEqual([])
  })

  it("shows compact preorder, mixed-cart, and bundle lines with shorter copy", () => {
    const lines = getCompactCartNoticeLines(
      [
        createLineItem({
          id: "line_preorder",
          unit_price: 900,
          metadata: {
            bundle_id: "bundle_123",
            bundle_title: "Starter Bundle",
            bundle_quantity: 1,
          },
          variant: {
            id: "variant_preorder",
            title: "Default Variant",
            prices: [{ amount: 1200, currency_code: "usd" }],
            preorder_variant: {
              status: "enabled",
              available_date: "2999-01-01T00:00:00.000Z",
              prices: [{ amount: 900, currency_code: "usd" }],
            },
          },
        }),
        createLineItem({
          id: "line_regular",
          unit_price: 1200,
          metadata: null,
          variant: {
            id: "variant_regular",
            title: "Default Variant",
            prices: [{ amount: 1200, currency_code: "usd" }],
            preorder_variant: undefined,
          },
        }),
      ],
      "usd"
    )

    expect(lines).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Pre-order items/i),
        "Mixed in-stock + pre-order cart",
        "1 bundle included",
      ])
    )
  })

  it("does not return compact variant lines for default variant titles", () => {
    const lines = getCompactCartNoticeLines([createLineItem()], "usd")

    expect(lines).not.toContain("1 item includes a selected variant")
  })

  it("does not include selected-variant wording in compact lines", () => {
    const lines = getCompactCartNoticeLines(
      [
        createLineItem({
          id: "line_variant_title",
          variant_title: "Power Tool Green",
          variant: {
            id: "variant_selected",
            title: "Default Variant",
            prices: [{ amount: 1200, currency_code: "usd" }],
            preorder_variant: undefined,
          },
        }),
      ],
      "usd"
    )

    expect(lines.some((line) => /selected variant/i.test(line))).toBe(false)
  })

  it("does not include selected-variant wording in page notices", () => {
    render(
      <CartNotices
        currencyCode="usd"
        items={[
          createLineItem({
            id: "line_variant_only",
            subtitle: "Power Tool Green",
            variant_title: "Power Tool Green",
            variant: {
              id: "variant_selected",
              title: "Default Variant",
              prices: [{ amount: 1200, currency_code: "usd" }],
              preorder_variant: undefined,
            },
          }),
        ]}
      />
    )

    expect(screen.queryByText(/selected variant/i)).not.toBeInTheDocument()
  })

  it("does not render for variant-only carts after removing variant notices", () => {
    const { container } = render(
      <CartNotices
        currencyCode="usd"
        items={[
          createLineItem({
            id: "line_variant_only",
            subtitle: "Power Tool Green",
            variant_title: "Power Tool Green",
            variant: {
              id: "variant_selected",
              title: "Default Variant",
              prices: [{ amount: 1200, currency_code: "usd" }],
              preorder_variant: undefined,
            },
          }),
        ]}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it("does not return compact lines for variant-only carts after removing variant notices", () => {
    const lines = getCompactCartNoticeLines(
      [
        createLineItem({
          id: "line_variant_title",
          variant_title: "Power Tool Green",
          subtitle: "Power Tool Green",
          variant: {
            id: "variant_selected",
            title: "Default Variant",
            prices: [{ amount: 1200, currency_code: "usd" }],
            preorder_variant: undefined,
          },
        }),
      ],
      "usd"
    )

    expect(lines).toEqual([])
  })

  it("does not show selected-variant guidance when bundled items only have variant titles", () => {
    render(
      <CartNotices
        currencyCode="usd"
        items={[
          createLineItem({
            id: "line_bundle_variant",
            subtitle: "Black - 180",
            variant_title: "Hardware Kit + Panel / Black - 180",
            metadata: {
              bundle_id: "bundle_variant",
              bundle_title: "Starter Bundle",
              bundle_quantity: 1,
            },
            variant: {
              id: "variant_bundle_selected",
              title: "Default Variant",
              prices: [{ amount: 1200, currency_code: "usd" }],
              preorder_variant: undefined,
            },
          }),
        ]}
      />
    )

    expect(screen.queryByText(/selected variant/i)).not.toBeInTheDocument()
  })

  it("does not return compact selected-variant lines for bundled items", () => {
    const lines = getCompactCartNoticeLines(
      [
        createLineItem({
          id: "line_bundle_variant",
          subtitle: "Black - 180",
          variant_title: "Hardware Kit + Panel / Black - 180",
          metadata: {
            bundle_id: "bundle_variant",
            bundle_title: "Starter Bundle",
            bundle_quantity: 1,
          },
          variant: {
            id: "variant_bundle_selected",
            title: "Default Variant",
            prices: [{ amount: 1200, currency_code: "usd" }],
            preorder_variant: undefined,
          },
        }),
      ],
      "usd"
    )

    expect(lines.some((line) => /selected variant/i.test(line))).toBe(false)
  })

  it("keeps bundle savings callouts separate from compact footer lines", () => {
    render(
      <CartNotices
        currencyCode="usd"
        items={[
          createLineItem({
            id: "line_bundle_1",
            unit_price: 900,
            metadata: {
              bundle_id: "bundle_123",
              bundle_title: "Starter Bundle",
              bundle_quantity: 1,
            },
            variant: {
              id: "variant_bundle_1",
              title: "Default Variant",
              prices: [{ amount: 1100, currency_code: "usd" }],
            },
          }),
          createLineItem({
            id: "line_bundle_2",
            unit_price: 600,
            metadata: {
              bundle_id: "bundle_123",
              bundle_title: "Starter Bundle",
              bundle_quantity: 1,
            },
            variant: {
              id: "variant_bundle_2",
              title: "Default Variant",
              prices: [{ amount: 700, currency_code: "usd" }],
            },
          }),
        ]}
      />
    )

    expect(screen.getByText(/Bundle savings applied/i)).toBeInTheDocument()
    expect(screen.queryByText(/bundle included/i)).not.toBeInTheDocument()
  })

  it("does not add compact lines when only bundle savings is present", () => {
    const lines = getCompactCartNoticeLines(
      [
        createLineItem({
          id: "line_bundle_1",
          unit_price: 900,
          metadata: {
            bundle_id: "bundle_123",
            bundle_title: "Starter Bundle",
            bundle_quantity: 1,
          },
          variant: {
            id: "variant_bundle_1",
            title: "Default Variant",
            prices: [{ amount: 1100, currency_code: "usd" }],
          },
        }),
      ],
      "usd"
    )

    expect(lines).toEqual(["1 bundle included"])
  })

  it("returns compact preorder and mixed-cart lines without variant wording", () => {
    const lines = getCompactCartNoticeLines(
      [
        createLineItem({
          id: "line_variant",
          variant: {
            id: "variant_selected",
            title: "Matte Black",
            prices: [{ amount: 1200, currency_code: "usd" }],
            preorder_variant: undefined,
          },
        }),
        createLineItem({
          id: "line_preorder",
          variant: {
            id: "variant_preorder",
            title: "Default Variant",
            prices: [{ amount: 1200, currency_code: "usd" }],
            preorder_variant: {
              status: "enabled",
              available_date: "2999-01-01T00:00:00.000Z",
              prices: [{ amount: 900, currency_code: "usd" }],
            },
          },
        }),
      ],
      "usd"
    )

    expect(lines).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Pre-order items/i),
        "Mixed in-stock + pre-order cart",
      ])
    )
    expect(lines.some((line) => /selected variant/i.test(line))).toBe(false)
  })

  it("shows the total bundle savings callout", () => {
    render(
      <CartNotices
        currencyCode="usd"
        items={[
          createLineItem({
            id: "line_bundle_1",
            unit_price: 900,
            metadata: {
              bundle_id: "bundle_123",
              bundle_title: "Starter Bundle",
              bundle_quantity: 1,
            },
            variant: {
              id: "variant_bundle_1",
              title: "Default Variant",
              prices: [{ amount: 1100, currency_code: "usd" }],
            },
          }),
          createLineItem({
            id: "line_bundle_2",
            unit_price: 600,
            metadata: {
              bundle_id: "bundle_123",
              bundle_title: "Starter Bundle",
              bundle_quantity: 1,
            },
            variant: {
              id: "variant_bundle_2",
              title: "Default Variant",
              prices: [{ amount: 700, currency_code: "usd" }],
            },
          }),
        ]}
      />
    )

    expect(screen.getByText(/Bundle savings applied/i)).toBeInTheDocument()
    expect(screen.getByText(/\$3\.00/)).toBeInTheDocument()
  })

  it("does not show bundle savings for preorder-priced bundle items", () => {
    render(
      <CartNotices
        currencyCode="usd"
        items={[
          createLineItem({
            id: "line_bundle_preorder",
            unit_price: 900,
            metadata: {
              bundle_id: "bundle_preorder",
              bundle_title: "Launch Bundle",
              bundle_quantity: 1,
            },
            variant: {
              id: "variant_bundle_preorder",
              title: "Default Variant",
              prices: [{ amount: 1400, currency_code: "usd" }],
              preorder_variant: {
                status: "enabled",
                available_date: "2999-01-01T00:00:00.000Z",
                prices: [{ amount: 900, currency_code: "usd" }],
              },
            },
          }),
        ]}
      />
    )

    expect(screen.queryByText(/Bundle savings applied/i)).not.toBeInTheDocument()
  })

})
