import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import { EMAIL_BRAND_LOGO_ALT, getEmailBrandLogoUrl } from '../brand-assets'
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
import type {
  OrderPlacedEmailStore,
  OrderShippedEmailFulfillment,
  OrderShippedEmailOrder,
} from '../types'

type Props = {
  order: OrderShippedEmailOrder
  shipment: OrderShippedEmailFulfillment
  store: OrderPlacedEmailStore
}

export default function OrderShippedEmail({ order, shipment, store }: Props) {
  const storeName = getCustomerStoreName(store)
  const orderNumber = getCustomerOrderNumber(order)
  const orderTrackingUrl = getOrderTrackingUrl(order)
  const shipmentDate = getShipmentDate(shipment)
  const shipmentTracking = getShipmentTrackingInfo(shipment)
  const shippingMethodName = getShippingMethodName(order)
  const shippingAddressLines = formatEmailAddress(order.shipping_address)

  return (
    <Html>
      <Head />
      <Preview>
        Your {storeName} order {orderNumber} is on its way
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Img
            alt={EMAIL_BRAND_LOGO_ALT}
            height="50"
            src={getEmailBrandLogoUrl()}
            style={brandLogoStyle}
            width="180"
          />
          <Text style={eyebrowStyle}>Order {orderNumber}</Text>
          <Heading style={headingStyle}>Your order has shipped.</Heading>
          <Text style={introStyle}>
            Hi {order.shipping_address?.first_name || 'there'}, your shipment from {storeName}
            {shipmentDate
              ? ` was marked shipped on ${formatEmailDate(shipmentDate)}.`
              : ' is on its way.'}
          </Text>
          <Button href={shipmentTracking.trackingUrl || orderTrackingUrl} style={buttonStyle}>
            Track shipment
          </Button>

          <Section style={sectionStyle}>
            <Heading as="h2" style={sectionHeadingStyle}>
              Tracking
            </Heading>
            {shipmentTracking.carrierName ? (
              <Text style={summaryTextStyle}>Carrier: {shipmentTracking.carrierName}</Text>
            ) : null}
            {shipmentTracking.trackingNumber ? (
              <Text style={summaryTextStyle}>
                Tracking number: {shipmentTracking.trackingNumber}
              </Text>
            ) : (
              <Text style={summaryTextStyle}>Tracking details are being prepared.</Text>
            )}
            <Text style={summaryTextStyle}>Track order: {orderTrackingUrl}</Text>
          </Section>

          <Section style={sectionStyle}>
            <Heading as="h2" style={sectionHeadingStyle}>
              Items in this order
            </Heading>
            {(order.items ?? []).map(item => {
              const variantText = getItemVariantText(item)

              return (
                <Text key={item.id} style={itemTextStyle}>
                  {getItemQuantity(item)} x {getItemTitle(item)}
                  {variantText ? ` - ${variantText}` : ''}
                </Text>
              )
            })}
          </Section>

          <Section style={sectionStyle}>
            <Heading as="h2" style={sectionHeadingStyle}>
              Delivery
            </Heading>
            {shippingMethodName ? (
              <Text style={summaryTextStyle}>Shipping method: {shippingMethodName}</Text>
            ) : null}
            {shippingAddressLines.map(line => (
              <Text key={line} style={addressLineStyle}>
                {line}
              </Text>
            ))}
          </Section>

          <Hr style={dividerStyle} />
          <Text style={footerStyle}>
            Need help with this shipment? Reply to this email and include order {orderNumber}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle = {
  backgroundColor: '#f5f7fb',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: 0,
  padding: '24px 0',
}

const containerStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #dde3ea',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '620px',
  padding: '32px',
}

const brandLogoStyle = {
  marginBottom: '24px',
  objectFit: 'contain' as const,
}

const eyebrowStyle = {
  color: '#5d6b7a',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
}

const headingStyle = {
  color: '#111827',
  fontSize: '28px',
  lineHeight: '34px',
  margin: '0 0 16px',
}

const introStyle = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
}

const buttonStyle = {
  backgroundColor: '#111827',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 700,
  padding: '12px 18px',
  textDecoration: 'none',
}

const sectionStyle = {
  borderTop: '1px solid #e5e7eb',
  marginTop: '28px',
  paddingTop: '22px',
}

const sectionHeadingStyle = {
  color: '#111827',
  fontSize: '18px',
  lineHeight: '24px',
  margin: '0 0 12px',
}

const summaryTextStyle = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '21px',
  margin: '0 0 8px',
}

const itemTextStyle = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '21px',
  margin: '0 0 6px',
}

const addressLineStyle = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 4px',
}

const dividerStyle = {
  borderColor: '#e5e7eb',
  margin: '28px 0 18px',
}

const footerStyle = {
  color: '#64748b',
  fontSize: '13px',
  lineHeight: '20px',
  margin: 0,
}
