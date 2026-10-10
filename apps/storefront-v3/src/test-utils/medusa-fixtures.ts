import type {
  MedusaCurrencyAmount,
  MedusaOrder,
  MedusaOrderLineItemWithPreorder,
  MedusaOrderFulfillmentWithLabels,
  MedusaOrderWithPreorder,
  MedusaPreorderVariant,
  MedusaProduct,
  MedusaProductVariant,
  MedusaProductVariantWithPreorder,
} from "@/lib/medusa/types"

type VariantFixtureInput = Omit<
  Partial<MedusaProductVariant>,
  "calculated_price" | "product"
> & {
  calculated_price?: Partial<
    NonNullable<MedusaProductVariant["calculated_price"]>
  >
  product?: Partial<MedusaProduct> | null
  preorder_variant?: Omit<MedusaPreorderVariant, "prices"> & {
    prices?: readonly MedusaCurrencyAmount[]
  }
}

export function createProductFixture(
  overrides: Partial<MedusaProduct> = {}
): MedusaProduct {
  return {
    id: "prod_fixture",
    title: "Fixture product",
    handle: "fixture-product",
    status: "published",
    is_giftcard: false,
    discountable: true,
    variants: [],
    options: [],
    images: [],
    external_id: null,
    type_id: null,
    collection_id: null,
    created_at: null,
    updated_at: null,
    deleted_at: null,
    subtitle: null,
    description: null,
    thumbnail: null,
    width: null,
    weight: null,
    length: null,
    height: null,
    origin_country: null,
    hs_code: null,
    mid_code: null,
    material: null,
    ...overrides,
  }
}

export function createVariantFixture(
  overrides: VariantFixtureInput = {}
): MedusaProductVariantWithPreorder {
  const { calculated_price, product, preorder_variant, ...rest } = overrides
  return {
    id: "variant_fixture",
    title: "Default",
    options: null,
    sku: null,
    barcode: null,
    ean: null,
    upc: null,
    thumbnail: null,
    width: null,
    weight: null,
    length: null,
    height: null,
    origin_country: null,
    hs_code: null,
    mid_code: null,
    material: null,
    allow_backorder: null,
    manage_inventory: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
    ...rest,
    ...(product !== undefined
      ? { product: product ? createProductFixture(product) : null }
      : {}),
    ...(preorder_variant
      ? {
          preorder_variant: {
            ...preorder_variant,
            prices: preorder_variant.prices
              ? [...preorder_variant.prices]
              : undefined,
          },
        }
      : {}),
    ...(calculated_price
      ? {
          calculated_price: {
            id: "ps_fixture",
            calculated_amount: null,
            original_amount: null,
            original_amount_with_tax: calculated_price.original_amount ?? null,
            original_amount_without_tax:
              calculated_price.original_amount ?? null,
            currency_code: null,
            ...calculated_price,
          },
        }
      : {}),
  }
}

type PaymentCollection = NonNullable<MedusaOrder["payment_collections"]>[number]
type Payment = NonNullable<PaymentCollection["payments"]>[number]
type PaymentCollectionInput = Omit<Partial<PaymentCollection>, "payments"> & {
  payments?: Partial<Payment>[] | null
}
type OrderLineItemInput = Omit<
  Partial<MedusaOrderLineItemWithPreorder>,
  "variant"
> & {
  variant?: VariantFixtureInput | null
}
export type OrderFixtureInput = Omit<
  Partial<MedusaOrderWithPreorder>,
  | "items"
  | "payment_collections"
  | "fulfillments"
  | "shipping_address"
  | "billing_address"
> & {
  shipping_address?: Partial<
    NonNullable<MedusaOrder["shipping_address"]>
  > | null
  billing_address?: Partial<NonNullable<MedusaOrder["billing_address"]>> | null
  items?: OrderLineItemInput[] | null
  payment_collections?: PaymentCollectionInput[] | null
  fulfillments?: Partial<MedusaOrderFulfillmentWithLabels>[] | null
}

function createOrderLineItemFixture(
  input: OrderLineItemInput
): MedusaOrderLineItemWithPreorder {
  const { variant, detail, ...rest } = input
  const item: MedusaOrderLineItemWithPreorder = {
    id: "item_fixture",
    title: "Fixture item",
    quantity: 1,
    unit_price: 0,
    created_at: new Date(0),
    updated_at: new Date(0),
    subtitle: null,
    thumbnail: null,
    metadata: null,
    product_id: null,
    product_title: null,
    product_description: null,
    product_subtitle: null,
    product_type: null,
    product_collection: null,
    product_handle: null,
    product_type_id: null,
    variant_id: null,
    variant_sku: null,
    variant_barcode: null,
    variant_title: null,
    variant_option_values: null,
    requires_shipping: true,
    is_discountable: true,
    is_tax_inclusive: false,
    item_total: 0,
    item_subtotal: 0,
    item_tax_total: 0,
    original_total: 0,
    original_subtotal: 0,
    original_tax_total: 0,
    total: 0,
    subtotal: 0,
    tax_total: 0,
    discount_total: 0,
    discount_tax_total: 0,
    refundable_total: 0,
    refundable_total_per_unit: 0,
    ...rest,
    ...(variant !== undefined
      ? { variant: variant ? createVariantFixture(variant) : undefined }
      : {}),
    detail: detail ?? {
      id: "detail_fixture",
      item_id: input.id ?? "item_fixture",
      get item() {
        return {
          ...item,
          variant: undefined,
          product: undefined,
          tax_lines: [],
          adjustments: [],
        }
      },
      quantity: input.quantity ?? 1,
      fulfilled_quantity: 0,
      delivered_quantity: 0,
      shipped_quantity: 0,
      return_requested_quantity: 0,
      return_received_quantity: 0,
      return_dismissed_quantity: 0,
      written_off_quantity: 0,
      metadata: null,
      created_at: new Date(0),
      updated_at: new Date(0),
    },
  }
  return item
}

function createPaymentCollectionFixture(
  input: PaymentCollectionInput
): PaymentCollection {
  const { payments, ...rest } = input
  return {
    id: "paycol_fixture",
    payment_providers: [],
    currency_code: "aud",
    amount: 0,
    status: "authorized",
    ...rest,
    payments:
      payments?.map((payment) => ({
        id: "pay_fixture",
        provider_id: "fixture",
        amount: 0,
        currency_code: "aud",
        ...payment,
      })) ?? [],
  }
}

function createFulfillmentFixture(
  input: Partial<MedusaOrderFulfillmentWithLabels>
): MedusaOrderFulfillmentWithLabels {
  return {
    id: "ful_fixture",
    metadata: null,
    created_at: new Date(0),
    updated_at: new Date(0),
    requires_shipping: true,
    location_id: "loc_fixture",
    provider_id: "fixture",
    packed_at: null,
    shipped_at: null,
    delivered_at: null,
    canceled_at: null,
    shipping_option_id: null,
    created_by: null,
    marked_shipped_by: null,
    ...input,
  }
}

type CompleteOrderFixture = Omit<MedusaOrderWithPreorder, "items"> & {
  items: MedusaOrderLineItemWithPreorder[] | null
}

export function createOrderFixture(
  input: OrderFixtureInput = {}
): CompleteOrderFixture {
  const {
    items,
    payment_collections,
    fulfillments,
    shipping_address,
    billing_address,
    ...rest
  } = input
  return {
    id: "order_fixture",
    status: "pending",
    created_at: new Date(0),
    updated_at: new Date(0),
    sales_channel_id: null,
    region_id: null,
    customer_id: null,
    email: null,
    currency_code: "aud",
    shipping_methods: [],
    original_item_total: 0,
    original_item_subtotal: 0,
    original_item_tax_total: 0,
    item_total: 0,
    item_subtotal: 0,
    item_tax_total: 0,
    original_total: 0,
    original_subtotal: 0,
    original_tax_total: 0,
    total: 0,
    subtotal: 0,
    tax_total: 0,
    discount_total: 0,
    discount_tax_total: 0,
    gift_card_total: 0,
    gift_card_tax_total: 0,
    shipping_total: 0,
    shipping_subtotal: 0,
    shipping_tax_total: 0,
    original_shipping_total: 0,
    original_shipping_subtotal: 0,
    original_shipping_tax_total: 0,
    item_discount_total: 0,
    shipping_discount_total: 0,
    credit_line_total: 0,
    payment_status: "authorized",
    fulfillment_status: "not_fulfilled",
    summary: {
      pending_difference: 0,
      current_order_total: 0,
      original_order_total: 0,
      transaction_total: 0,
      paid_total: 0,
      refunded_total: 0,
      accounting_total: 0,
    },
    ...rest,
    ...(shipping_address
      ? {
          shipping_address: {
            id: "addr_shipping_fixture",
            metadata: null,
            created_at: new Date(0),
            updated_at: new Date(0),
            ...shipping_address,
          },
        }
      : shipping_address === null
        ? { shipping_address: null }
        : {}),
    ...(billing_address
      ? {
          billing_address: {
            id: "addr_billing_fixture",
            metadata: null,
            created_at: new Date(0),
            updated_at: new Date(0),
            ...billing_address,
          },
        }
      : billing_address === null
        ? { billing_address: null }
        : {}),
    items:
      items === null ? null : (items?.map(createOrderLineItemFixture) ?? []),
    payment_collections:
      payment_collections?.map(createPaymentCollectionFixture) ?? [],
    fulfillments:
      fulfillments === null
        ? null
        : (fulfillments?.map(createFulfillmentFixture) ?? []),
  }
}
