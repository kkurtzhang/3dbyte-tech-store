import type { OrderShippedEmailFulfillment } from './types'

export type ShipmentTrackingInfo = {
  carrierName: string | null
  trackingNumber: string | null
  trackingUrl: string | null
}

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

export const getShipmentTrackingInfo = (
  shipment: OrderShippedEmailFulfillment
): ShipmentTrackingInfo => {
  const data = shipment.data ?? {}
  const firstLabel = shipment.labels?.find(label => label.tracking_number?.trim())
  const trackingNumber = readString(data.tracking_number) ?? readString(firstLabel?.tracking_number)
  const trackingUrl = readString(data.tracking_url) ?? readString(firstLabel?.tracking_url)
  const carrierName =
    readString(data.carrier_name) ??
    readString(data.carrier) ??
    readString(data.carrier_id) ??
    readString(shipment.provider_id)

  return {
    carrierName,
    trackingNumber,
    trackingUrl,
  }
}

export const getShipmentDate = (shipment: OrderShippedEmailFulfillment): string | Date | null =>
  shipment.shipped_at ?? shipment.created_at ?? null
