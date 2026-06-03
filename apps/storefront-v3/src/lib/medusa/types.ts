import { sdk } from './client'

export type MedusaCurrencyAmount = {
  amount: number
  currency_code: string
}

export type MedusaPreorderVariant = {
  id?: string
  variant_id?: string
  available_date: string
  prices?: MedusaCurrencyAmount[]
  status: 'enabled' | 'disabled'
}

type MedusaProductBase = NonNullable<
  Awaited<ReturnType<typeof sdk.store.product.list>>['products']
>[number]

export type MedusaProduct = MedusaProductBase

export type MedusaProductVariant = NonNullable<MedusaProductBase['variants']>[number]

export type MedusaProductVariantWithPreorder = MedusaProductVariant & {
  preorder_variant?: MedusaPreorderVariant
}

export type MedusaProductWithPreorder = Omit<MedusaProductBase, 'variants'> & {
  variants?: MedusaProductVariantWithPreorder[] | null
}

type MedusaCartBase = NonNullable<Awaited<ReturnType<typeof sdk.store.cart.retrieve>>['cart']>

export type MedusaCart = MedusaCartBase

export type MedusaCartLineItem = NonNullable<MedusaCartBase['items']>[number]

export type MedusaCartLineItemWithPreorder = MedusaCartLineItem & {
  variant?: MedusaProductVariantWithPreorder | null
}

export type MedusaCartWithPreorder = Omit<MedusaCartBase, 'items'> & {
  items?: MedusaCartLineItemWithPreorder[] | null
}

type MedusaOrderBase = NonNullable<Awaited<ReturnType<typeof sdk.store.order.retrieve>>['order']>

type MedusaOrderFulfillmentBase = NonNullable<MedusaOrderBase['fulfillments']>[number]

export type MedusaOrderFulfillmentLabel = {
  id?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
}

export type MedusaOrderFulfillmentWithLabels = Omit<
  MedusaOrderFulfillmentBase,
  'data' | 'labels'
> & {
  data?: Record<string, unknown> | null
  labels?: MedusaOrderFulfillmentLabel[] | null
}

export type MedusaOrderTrackingPaymentMethod = {
  type: 'card'
  brand: string
  last4: string
}

export type MedusaOrder = Omit<MedusaOrderBase, 'fulfillments'> & {
  fulfillments?: MedusaOrderFulfillmentWithLabels[] | null
  tracking_payment_method?: MedusaOrderTrackingPaymentMethod | null
}

export type MedusaOrderLineItem = NonNullable<MedusaOrderBase['items']>[number]

export type MedusaOrderLineItemWithPreorder = MedusaOrderLineItem & {
  variant?: MedusaProductVariantWithPreorder | null
}

export type MedusaOrderWithPreorder = Omit<MedusaOrderBase, 'items'> & {
  items?: MedusaOrderLineItemWithPreorder[] | null
}

export type MedusaCollection = NonNullable<
  Awaited<ReturnType<typeof sdk.store.collection.list>>['collections']
>[number]

export type MedusaProductCategory = NonNullable<
  Awaited<ReturnType<typeof sdk.store.category.list>>['product_categories']
>[number]
