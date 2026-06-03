import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import { renderOrderShippedEmail } from '../../emails/renderers/order-shipped'
import type { OrderShippedEmailFulfillment, OrderShippedEmailOrder } from '../../emails/types'
import { resolveSenderProfileFromContainer } from '../../lib/email-settings/sender-profiles'
import { areOrderEmailsEnabled } from '../orders/order-placed'

type ShipmentCreatedEvent = {
  id?: string
  no_notification?: boolean
}

type LinkModuleService = {
  list: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<Array<Record<string, unknown>>>
}

type LinkRegistry = {
  getLinkModule: (
    moduleA: string,
    moduleAKey: string,
    moduleB: string,
    moduleBKey: string
  ) => LinkModuleService | undefined
}

const shipmentOrderFields = [
  'id',
  'email',
  'display_id',
  'custom_display_id',
  'created_at',
  'currency_code',
  'items.id',
  'items.title',
  'items.subtitle',
  'items.product_title',
  'items.variant_title',
  'items.quantity',
  'items.detail.quantity',
  'items.detail.raw_quantity',
  'items.metadata',
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
  'shipping_methods.name',
  'fulfillments.id',
  'fulfillments.created_at',
  'fulfillments.shipped_at',
  'fulfillments.data',
  'fulfillments.provider_id',
  'fulfillments.labels.id',
  'fulfillments.labels.tracking_number',
  'fulfillments.labels.tracking_url',
]

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const getOrderFulfillmentLinkService = (link: LinkRegistry): LinkModuleService | undefined =>
  link.getLinkModule(Modules.ORDER, 'order_id', Modules.FULFILLMENT, 'fulfillment_id')

const findOrderIdForFulfillment = async (
  container: SubscriberArgs<ShipmentCreatedEvent>['container'],
  fulfillmentId: string
): Promise<string | null> => {
  const link = container.resolve(ContainerRegistrationKeys.LINK) as LinkRegistry
  const orderFulfillmentLink = getOrderFulfillmentLinkService(link)

  if (!orderFulfillmentLink) {
    return null
  }

  const rows = await orderFulfillmentLink.list(
    { fulfillment_id: fulfillmentId },
    { select: ['order_id', 'fulfillment_id'], take: 1 }
  )

  return readString(rows[0]?.order_id)
}

const findShipmentInOrder = (
  order: OrderShippedEmailOrder,
  fulfillmentId: string
): OrderShippedEmailFulfillment | null => {
  return order.fulfillments?.find(fulfillment => fulfillment.id === fulfillmentId) ?? null
}

export default async function orderShippedHandler({
  event: { data },
  container,
}: SubscriberArgs<ShipmentCreatedEvent>) {
  if (data.no_notification || !data.id || !areOrderEmailsEnabled()) {
    return
  }

  const orderId = await findOrderIdForFulfillment(container, data.id)

  if (!orderId) {
    container
      .resolve('logger')
      .warn(`order-shipped subscriber: order not found for fulfillment ${data.id}`)
    return
  }

  const query = container.resolve('query')
  const {
    data: [store],
  } = await query.graph({
    entity: 'store',
    fields: ['name'],
  })
  const {
    data: [order],
  } = await query.graph({
    entity: 'order',
    fields: shipmentOrderFields,
    filters: {
      id: orderId,
    },
  })

  if (!order?.email) {
    return
  }

  const shipment = findShipmentInOrder(order as unknown as OrderShippedEmailOrder, data.id)

  if (!shipment) {
    return
  }

  const notificationModule = container.resolve('notification')
  const senderProfile = await resolveSenderProfileFromContainer(container, 'order')
  const idempotencyKey = `order-shipped/${order.id}/${shipment.id}`
  const content = await renderOrderShippedEmail({
    order: order as unknown as OrderShippedEmailOrder,
    shipment,
    store: {
      name: store?.name,
    },
  })

  await notificationModule.createNotifications({
    to: order.email,
    channel: 'email',
    template: 'order-shipped',
    from: senderProfile.from,
    provider_data: {
      reply_to: senderProfile.reply_to,
    },
    idempotency_key: idempotencyKey,
    content,
    data: {
      order,
      shipment,
      email_metadata: {
        entity_id: order.id,
        event: 'shipment.created',
        fulfillment_id: shipment.id,
        idempotency_key: idempotencyKey,
      },
    },
  })
}

export const config: SubscriberConfig = {
  event: 'shipment.created',
}
