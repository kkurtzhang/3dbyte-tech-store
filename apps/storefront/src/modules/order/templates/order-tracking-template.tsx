import { HttpTypes } from '@medusajs/types'
import { Heading } from '@medusajs/ui'
import { Box } from '@modules/common/components/box'
import { Container } from '@modules/common/components/container'
import { Text } from '@modules/common/components/text'
import TrackingStatus from '../components/tracking-status'
import TrackingInfo from '../components/tracking-info'
import { getOrderStatus, getFulfillmentStatus } from '@lib/util/format-order'

type OrderTrackingTemplateProps = {
  orderId: string
  trackingData: {
    order_id: string
    order_status: string
    fulfillment_status: string
    tracking_status: string
    tracking_info: Array<{
      id: string
      tracking_number: string | null
      carrier: string
      carrier_link: string | null
      status: string
      created_at: string
      updated_at: string
    }>
    shipping_address: HttpTypes.StoreOrderAddress
    created_at: string
    updated_at: string
  }
}

export default function OrderTrackingTemplate({
  orderId,
  trackingData,
}: OrderTrackingTemplateProps) {
  const orderStatus = getOrderStatus(trackingData.order_status)
  const fulfillmentStatus = getFulfillmentStatus(trackingData.fulfillment_status)

  return (
    <Box className="bg-secondary">
      <Container className="mx-auto py-8">
        <Box
          className="mx-auto flex h-full w-full max-w-2xl flex-col gap-6"
          data-testid="order-tracking-container"
        >
          {/* Header */}
          <Box className="flex flex-col items-center gap-2 py-6 text-center">
            <Heading
              level="h1"
              className="text-xl font-normal text-basic-primary sm:max-w-md medium:text-2xl"
            >
              Order Tracking
            </Heading>
            <Text size="md" className="text-secondary">
              Order #{orderId}
            </Text>
          </Box>

          {/* Tracking Status Timeline */}
          <TrackingStatus
            trackingStatus={trackingData.tracking_status}
            orderStatus={orderStatus}
            fulfillmentStatus={fulfillmentStatus}
          />

          {/* Tracking Information */}
          {trackingData.tracking_info && trackingData.tracking_info.length > 0 ? (
            <TrackingInfo trackingInfo={trackingData.tracking_info} />
          ) : (
            <Box className="rounded-lg bg-primary p-6 text-center">
              <Text size="base" className="text-secondary">
                Tracking information will be available once your order has been shipped.
              </Text>
            </Box>
          )}

          {/* Shipping Address */}
          <Box className="rounded-lg bg-primary p-4">
            <Text size="large" className="mb-3">
              Shipping Address
            </Text>
            <Box className="flex flex-col gap-1">
              <Text size="base" className="text-secondary">
                {trackingData.shipping_address?.first_name}{' '}
                {trackingData.shipping_address?.last_name}
              </Text>
              {trackingData.shipping_address?.address_1 && (
                <Text size="base" className="text-secondary">
                  {trackingData.shipping_address.address_1}
                </Text>
              )}
              {trackingData.shipping_address?.address_2 && (
                <Text size="base" className="text-secondary">
                  {trackingData.shipping_address.address_2}
                </Text>
              )}
              {trackingData.shipping_address?.city && (
                <Text size="base" className="text-secondary">
                  {trackingData.shipping_address.city}
                </Text>
              )}
              {trackingData.shipping_address?.province && (
                <Text size="base" className="text-secondary">
                  {trackingData.shipping_address.province}
                </Text>
              )}
              {trackingData.shipping_address?.postal_code && (
                <Text size="base" className="text-secondary">
                  {trackingData.shipping_address.postal_code}
                </Text>
              )}
              {trackingData.shipping_address?.country_code && (
                <Text size="base" className="text-secondary">
                  {trackingData.shipping_address.country_code}
                </Text>
              )}
            </Box>
          </Box>

          {/* Order Dates */}
          <Box className="rounded-lg bg-primary p-4">
            <Box className="flex flex-col gap-3">
              <Box>
                <Text size="large">Order Date</Text>
                <Text size="base" className="text-secondary">
                  {new Date(trackingData.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                  })}
                </Text>
              </Box>
              <Box>
                <Text size="large">Last Updated</Text>
                <Text size="base" className="text-secondary">
                  {new Date(trackingData.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                  })}
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
