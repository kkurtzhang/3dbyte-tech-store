import { pretty, render } from '@react-email/render'

import { formatEmailAddress, formatEmailDate } from '../formatters'
import {
  getCustomerOrderNumber,
  getCustomerStoreName,
  getItemQuantity,
  getItemTitle,
  getItemVariantText,
  getOrderTrackingUrl,
  getShippingMethodName,
} from '../order-placed-data'
import { getShipmentDate, getShipmentTrackingInfo } from '../order-shipped-data'
import OrderShippedEmail from '../templates/order-shipped'
import type {
  OrderPlacedEmailStore,
  OrderShippedEmailFulfillment,
  OrderShippedEmailOrder,
  RenderedEmail,
} from '../types'

type RenderOrderShippedEmailInput = {
  order: OrderShippedEmailOrder
  shipment: OrderShippedEmailFulfillment
  store: OrderPlacedEmailStore
}

const getItemTextLine = (item: NonNullable<OrderShippedEmailOrder['items']>[number]): string => {
  const variantText = getItemVariantText(item)

  return `${getItemQuantity(item)} x ${getItemTitle(item)}${variantText ? ` (${variantText})` : ''}`
}

export const renderOrderShippedEmail = async ({
  order,
  shipment,
  store,
}: RenderOrderShippedEmailInput): Promise<RenderedEmail> => {
  const storeName = getCustomerStoreName(store)
  const orderNumber = getCustomerOrderNumber(order)
  const orderTrackingUrl = getOrderTrackingUrl(order)
  const shipmentDate = getShipmentDate(shipment)
  const shipmentTracking = getShipmentTrackingInfo(shipment)
  const html = await pretty(
    await render(
      <OrderShippedEmail order={order} shipment={shipment} store={{ name: storeName }} />
    )
  )
  const shippingAddressLines = formatEmailAddress(order.shipping_address)
  const shippingMethodName = getShippingMethodName(order)

  return {
    html,
    subject: `Your ${storeName} order ${orderNumber} has shipped`,
    text: [
      `Order ${orderNumber} has shipped`,
      ...(shipmentDate ? [`Shipped: ${formatEmailDate(shipmentDate)}`] : []),
      '',
      ...(shipmentTracking.carrierName ? [`Carrier: ${shipmentTracking.carrierName}`] : []),
      ...(shipmentTracking.trackingNumber
        ? [`Tracking number: ${shipmentTracking.trackingNumber}`]
        : ['Tracking details are being prepared.']),
      `Track shipment: ${shipmentTracking.trackingUrl || orderTrackingUrl}`,
      `Track order: ${orderTrackingUrl}`,
      '',
      'Items:',
      ...(order.items ?? []).map(getItemTextLine),
      '',
      ...(shippingMethodName ? [`Shipping method: ${shippingMethodName}`, ''] : []),
      'Shipping address:',
      ...shippingAddressLines,
    ].join('\n'),
  }
}
