import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { z } from '@medusajs/framework/zod'

import {
  extractPaymentMethodId,
  retrieveStripePaymentMethod,
  type OrderWithPayments,
} from '../../../../utils/stripe-payment-method'

export const PostStoreOrderLookupSchema = z.object({
  reference: z.string().trim().min(6).max(100),
  email: z.string().trim().toLowerCase().email().max(320),
})

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
  'shipping_total',
  'shipping_subtotal',
  'tax_total',
  'discount_total',
  'total',
  'items.id',
  'items.title',
  'items.subtitle',
  'items.product_title',
  'items.variant_title',
  'items.variant_sku',
  'items.quantity',
  'items.detail.quantity',
  'items.unit_price',
  'items.subtotal',
  'items.total',
  'items.item_subtotal',
  'items.item_total',
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
  'fulfillments.labels.id',
  'fulfillments.labels.tracking_number',
  'fulfillments.labels.tracking_url',
  'shipping_methods.name',
  'shipping_methods.amount',
  'shipping_address.city',
  'shipping_address.province',
  'shipping_address.postal_code',
  'shipping_address.country_code',
  'payment_collections.payments.provider_id',
  'payment_collections.payments.data',
]

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

type LookupOrder = Record<string, unknown> & OrderWithPayments & {
  email?: string | null
  fulfillments?: Array<Record<string, unknown>> | null
  items?: LookupLineItem[] | null
}

const hasShippedFulfillment = (order: LookupOrder): boolean =>
  Array.isArray(order.fulfillments) &&
  order.fulfillments.some(fulfillment => {
    return (
      fulfillment.status === 'shipped' ||
      Boolean(fulfillment.shipped_at)
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
    ...orderWithDerivedStatus,
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

const sanitizePublicLookupOrder = (order: LookupOrder): LookupOrder => {
  const {
    billing_address: _billingAddress,
    email: _email,
    payment_collections: _paymentCollections,
    ...safeOrder
  } = normalizeOrderForStoreDisplay(order)

  return safeOrder
}

const getSafePaymentMethod = async (order: LookupOrder) => {
  const paymentMethodId = extractPaymentMethodId(order)

  if (!paymentMethodId) return null

  try {
    return await retrieveStripePaymentMethod(paymentMethodId)
  } catch {
    return null
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  res.setHeader('Cache-Control', 'no-store')
  const parsed = PostStoreOrderLookupSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ order: null })
    return
  }

  const { reference, email } = parsed.data

  const query = req.scope.resolve('query')
  let orders: unknown[] | undefined

  try {
    const result = await query.graph({
      entity: 'order',
      fields: lookupOrderFields,
      filters: reference.startsWith('order_')
        ? { id: reference }
        : { custom_display_id: reference },
    })
    orders = result.data
  } catch (error) {
    const logger = req.scope.resolve('logger')
    logger.error('Public order lookup failed', error)
    res.status(503).json({ order: null })
    return
  }

  const order = orders?.[0] as LookupOrder | undefined

  if (!order || order.email?.toLowerCase() !== email) {
    res.status(404).json({ order: null })
    return
  }

  res.json({
    order: {
      ...sanitizePublicLookupOrder(order),
      tracking_payment_method: await getSafePaymentMethod(order),
    },
  })
}
