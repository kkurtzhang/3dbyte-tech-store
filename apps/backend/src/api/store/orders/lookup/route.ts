import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

const lookupOrderFields = [
  'id',
  'email',
  'display_id',
  'custom_display_id',
  'status',
  'payment_status',
  'fulfillment_status',
  'currency_code',
  'created_at',
  'subtotal',
  'item_subtotal',
  'item_total',
  'raw_subtotal',
  'raw_item_subtotal',
  'raw_item_total',
  'shipping_total',
  'shipping_subtotal',
  'raw_shipping_total',
  'raw_shipping_subtotal',
  'tax_total',
  'raw_tax_total',
  'discount_total',
  'total',
  'raw_total',
  'payment_collections.payments.provider_id',
  'payment_collections.payments.data',
  'items.id',
  'items.title',
  'items.subtitle',
  'items.product_title',
  'items.variant_title',
  'items.variant_sku',
  'items.quantity',
  'items.detail.quantity',
  'items.detail.raw_quantity',
  'items.unit_price',
  'items.subtotal',
  'items.total',
  'items.item_subtotal',
  'items.item_total',
  'items.raw_subtotal',
  'items.raw_total',
  'items.raw_item_subtotal',
  'items.raw_item_total',
  'items.raw_quantity',
  'items.metadata',
  'items.thumbnail',
  'items.variant.id',
  'items.variant.title',
  'items.variant.product.id',
  'items.variant.product.title',
  'items.variant.preorder_variant.status',
  'items.variant.preorder_variant.available_date',
  'items.variant.preorder_variant.prices.amount',
  'items.variant.preorder_variant.prices.currency_code',
  'fulfillments.id',
  'fulfillments.status',
  'fulfillments.shipped_at',
  'fulfillments.data',
  'fulfillments.labels.id',
  'fulfillments.labels.tracking_number',
  'fulfillments.labels.tracking_url',
  'shipping_methods.name',
  'shipping_methods.amount',
  'shipping_address.first_name',
  'shipping_address.last_name',
  'shipping_address.company',
  'shipping_address.address_1',
  'shipping_address.address_2',
  'shipping_address.city',
  'shipping_address.province',
  'shipping_address.postal_code',
  'shipping_address.country_code',
  'shipping_address.phone',
  'billing_address.first_name',
  'billing_address.last_name',
  'billing_address.company',
  'billing_address.address_1',
  'billing_address.address_2',
  'billing_address.city',
  'billing_address.province',
  'billing_address.postal_code',
  'billing_address.country_code',
  'billing_address.phone',
]

const getQueryValue = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const getFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  if (typeof value === 'object' && value !== null) {
    const numericValue = Number(value)

    return Number.isFinite(numericValue) ? numericValue : null
  }

  return null
}

const isCloseMoney = (left: number, right: number): boolean => Math.abs(left - right) < 0.01

type LookupLineItem = Record<string, unknown>

type LookupOrder = Record<string, unknown> & {
  email?: string | null
  fulfillments?: Array<Record<string, unknown>> | null
  items?: LookupLineItem[] | null
}

const hasShippedFulfillment = (order: LookupOrder): boolean =>
  Array.isArray(order.fulfillments) &&
  order.fulfillments.some(fulfillment => {
    const data = fulfillment.data as Record<string, unknown> | null | undefined

    return (
      fulfillment.status === 'shipped' ||
      Boolean(fulfillment.shipped_at) ||
      Boolean(data?.shipped_at)
    )
  })

const deriveFulfillmentStatus = (order: LookupOrder): unknown => {
  if (hasShippedFulfillment(order)) {
    return 'shipped'
  }

  return order.fulfillment_status
}

const normalizeLineItemForStoreDisplay = (
  item: LookupLineItem,
  shouldNormalizeTaxInclusiveTotals: boolean,
  taxRate: number
): LookupLineItem => {
  if (!shouldNormalizeTaxInclusiveTotals) return item

  const subtotal = getFiniteNumber(item.subtotal)
  const total = getFiniteNumber(item.total)
  const displayTotal = subtotal ?? total
  const exclusiveSubtotal =
    displayTotal !== null && taxRate > 0 ? displayTotal / (1 + taxRate) : displayTotal

  if (displayTotal === null) return item

  return {
    ...item,
    item_subtotal: exclusiveSubtotal,
    item_total: displayTotal,
    subtotal: exclusiveSubtotal,
    total: displayTotal,
  }
}

const normalizeOrderForStoreDisplay = (order: LookupOrder): LookupOrder => {
  const orderWithDerivedStatus = {
    ...order,
    fulfillment_status: deriveFulfillmentStatus(order),
  }
  const graphSubtotal = getFiniteNumber(order.subtotal)
  const graphTotal = getFiniteNumber(order.total)
  const graphTaxTotal = getFiniteNumber(order.tax_total)
  const isAdditiveTaxTotal =
    graphSubtotal !== null &&
    graphTotal !== null &&
    graphTaxTotal !== null &&
    graphTotal > graphSubtotal &&
    isCloseMoney(graphTotal - graphSubtotal, graphTaxTotal)

  if (!isAdditiveTaxTotal) return orderWithDerivedStatus

  const discountTotal = getFiniteNumber(order.discount_total) ?? 0
  const shippingTotal =
    getFiniteNumber(order.shipping_subtotal) ?? getFiniteNumber(order.shipping_total) ?? 0
  const taxRate = graphSubtotal > 0 ? graphTaxTotal / graphSubtotal : 0
  const includedTaxTotal = taxRate > 0 ? graphSubtotal * (taxRate / (1 + taxRate)) : graphTaxTotal
  const itemTotal = Math.max(0, graphSubtotal - shippingTotal + discountTotal)
  const itemSubtotal = taxRate > 0 ? itemTotal / (1 + taxRate) : itemTotal
  const shippingSubtotal = taxRate > 0 ? shippingTotal / (1 + taxRate) : shippingTotal
  const subtotal = Math.max(0, graphSubtotal - includedTaxTotal)

  return {
    ...order,
    item_subtotal: itemSubtotal,
    item_total: itemTotal,
    shipping_subtotal: shippingSubtotal,
    shipping_total: shippingTotal,
    subtotal,
    tax_total: includedTaxTotal,
    total: graphSubtotal,
    items: Array.isArray(orderWithDerivedStatus.items)
      ? orderWithDerivedStatus.items.map(item =>
          normalizeLineItemForStoreDisplay(item, isAdditiveTaxTotal, taxRate)
        )
      : orderWithDerivedStatus.items,
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const reference = getQueryValue(req.query.reference)
  const email = getQueryValue(req.query.email).toLowerCase()

  if (!reference || !email) {
    res.status(400).json({ order: null })
    return
  }

  const query = req.scope.resolve('query')
  const { data: orders } = await query.graph({
    entity: 'order',
    fields: lookupOrderFields,
    filters: {
      custom_display_id: reference,
    },
  })

  const order = orders?.[0] as LookupOrder | undefined

  if (!order || order.email?.toLowerCase() !== email) {
    res.status(404).json({ order: null })
    return
  }

  res.json({ order: normalizeOrderForStoreDisplay(order) })
}
