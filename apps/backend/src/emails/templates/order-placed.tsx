import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

import {
  areEmailAddressesEqual,
  formatEmailAddress,
  formatEmailDate,
  formatEmailMoney,
} from "../formatters";
import {
  getCustomerOrderNumber,
  getCustomerStoreName,
  getItemLineTotal,
  getItemQuantity,
  getItemTitle,
  getItemVariantText,
  getOrderShippingTotal,
  getOrderTaxTotal,
  getOrderTotal,
  getShippingMethodName,
  getSummarySubtotal,
} from "../order-placed-data";
import type { OrderPlacedEmailOrder, OrderPlacedEmailStore } from "../types";

type Props = {
  order: OrderPlacedEmailOrder;
  store: OrderPlacedEmailStore;
};

const formatDiscount = (
  amount: number | null | undefined,
  currencyCode: string,
): string => `-${formatEmailMoney(Math.abs(amount ?? 0), currencyCode)}`;

export default function OrderPlacedEmail({ order, store }: Props) {
  const storeName = getCustomerStoreName(store);
  const orderNumber = getCustomerOrderNumber(order);
  const items = order.items || [];
  const shippingAddressLines = formatEmailAddress(order.shipping_address);
  const billingAddressLines = areEmailAddressesEqual(
    order.shipping_address,
    order.billing_address,
  )
    ? ["Same as shipping address"]
    : formatEmailAddress(order.billing_address);
  const shippingMethodName = getShippingMethodName(order);
  const discountTotal = order.discount_total ?? 0;

  return (
    <Html>
      <Head />
      <Preview>
        Your {storeName} order {orderNumber} has been received
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={eyebrowStyle}>Order {orderNumber}</Text>
          <Heading style={headingStyle}>
            Thanks, we have received your order.
          </Heading>
          <Text style={introStyle}>
            Hi {order.shipping_address?.first_name || "there"}, your order from{" "}
            {storeName} was placed on {formatEmailDate(order.created_at)}. We
            will send another email when the order is on its way.
          </Text>

          <Section style={sectionStyle}>
            <Heading as="h2" style={sectionHeadingStyle}>Items</Heading>
            {items.map((item) => (
              <Row key={item.id} style={itemRowStyle}>
                <Column style={thumbnailColumnStyle}>
                  {item.thumbnail ? (
                    <Img
                      alt={getItemTitle(item)}
                      src={item.thumbnail}
                      style={thumbnailStyle}
                    />
                  ) : (
                    <Text style={thumbnailFallbackStyle}>3D</Text>
                  )}
                </Column>
                <Column>
                  <Text style={itemTitleStyle}>{getItemTitle(item)}</Text>
                  {getItemVariantText(item) ? (
                    <Text style={mutedTextStyle}>{getItemVariantText(item)}</Text>
                  ) : null}
                  {item.variant_sku ? (
                    <Text style={mutedTextStyle}>SKU: {item.variant_sku}</Text>
                  ) : null}
                </Column>
                <Column style={quantityColumnStyle}>
                  <Text style={mutedTextStyle}>Qty {getItemQuantity(item)}</Text>
                </Column>
                <Column style={moneyColumnStyle}>
                  <Text style={itemPriceStyle}>
                    {formatEmailMoney(getItemLineTotal(item), order.currency_code)}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Section style={sectionStyle}>
            <Heading as="h2" style={sectionHeadingStyle}>Delivery</Heading>
            {shippingMethodName ? (
              <Text style={summaryTextStyle}>Shipping method: {shippingMethodName}</Text>
            ) : null}
            <Row>
              <Column style={addressColumnStyle}>
                <Text style={addressHeadingStyle}>Shipping address</Text>
                {shippingAddressLines.map((line) => (
                  <Text key={line} style={addressLineStyle}>{line}</Text>
                ))}
              </Column>
              <Column style={addressColumnStyle}>
                <Text style={addressHeadingStyle}>Billing address</Text>
                {billingAddressLines.map((line) => (
                  <Text key={line} style={addressLineStyle}>{line}</Text>
                ))}
              </Column>
            </Row>
          </Section>

          <Section style={sectionStyle}>
            <Heading as="h2" style={sectionHeadingStyle}>Order summary</Heading>
            <SummaryLine label="Subtotal" value={formatEmailMoney(getSummarySubtotal(order), order.currency_code)} />
            {discountTotal !== 0 ? (
              <SummaryLine label="Discount" value={formatDiscount(discountTotal, order.currency_code)} />
            ) : null}
            <SummaryLine label="Shipping" value={formatEmailMoney(getOrderShippingTotal(order), order.currency_code)} />
            <SummaryLine label="Tax" value={formatEmailMoney(getOrderTaxTotal(order), order.currency_code)} />
            <Hr style={dividerStyle} />
            <SummaryLine
              label="Total"
              value={formatEmailMoney(getOrderTotal(order), order.currency_code)}
              strong
            />
          </Section>

          <Text style={footerStyle}>
            Need help with this order? Reply to this email and include order{" "}
            {orderNumber}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function SummaryLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <Row style={summaryRowStyle}>
      <Column>
        <Text style={strong ? summaryStrongTextStyle : summaryTextStyle}>{label}</Text>
      </Column>
      <Column style={moneyColumnStyle}>
        <Text style={strong ? summaryStrongTextStyle : summaryTextStyle}>{value}</Text>
      </Column>
    </Row>
  );
}

const bodyStyle = {
  backgroundColor: "#f4f5f7",
  color: "#111827",
  fontFamily: "Arial, sans-serif",
};

const containerStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  margin: "24px auto",
  maxWidth: "680px",
  padding: "32px",
};

const eyebrowStyle = {
  color: "#6b7280",
  fontSize: "13px",
  letterSpacing: "0",
  margin: "0 0 8px",
};

const headingStyle = {
  fontSize: "26px",
  lineHeight: "32px",
  margin: "0 0 12px",
};

const introStyle = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 24px",
};

const sectionStyle = {
  borderTop: "1px solid #e5e7eb",
  padding: "22px 0 0",
};

const sectionHeadingStyle = {
  fontSize: "16px",
  lineHeight: "22px",
  margin: "0 0 14px",
};

const itemRowStyle = {
  borderBottom: "1px solid #f3f4f6",
  padding: "12px 0",
};

const thumbnailColumnStyle = {
  width: "56px",
};

const thumbnailStyle = {
  border: "1px solid #e5e7eb",
  height: "44px",
  objectFit: "cover" as const,
  width: "44px",
};

const thumbnailFallbackStyle = {
  backgroundColor: "#f3f4f6",
  border: "1px solid #e5e7eb",
  color: "#6b7280",
  fontSize: "12px",
  height: "44px",
  lineHeight: "44px",
  margin: "0",
  textAlign: "center" as const,
  width: "44px",
};

const itemTitleStyle = {
  fontSize: "14px",
  fontWeight: "700",
  lineHeight: "20px",
  margin: "0 0 4px",
};

const mutedTextStyle = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "18px",
  margin: "0",
};

const quantityColumnStyle = {
  textAlign: "right" as const,
  width: "64px",
};

const moneyColumnStyle = {
  textAlign: "right" as const,
  width: "112px",
};

const itemPriceStyle = {
  fontSize: "14px",
  fontWeight: "700",
  lineHeight: "20px",
  margin: "0",
};

const addressColumnStyle = {
  width: "50%",
};

const addressHeadingStyle = {
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: "18px",
  margin: "0 0 8px",
};

const addressLineStyle = {
  color: "#374151",
  fontSize: "13px",
  lineHeight: "18px",
  margin: "0 0 3px",
};

const summaryRowStyle = {
  margin: "0",
};

const summaryTextStyle = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 8px",
};

const summaryStrongTextStyle = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "700",
  lineHeight: "22px",
  margin: "0",
};

const dividerStyle = {
  borderColor: "#e5e7eb",
  margin: "8px 0 12px",
};

const footerStyle = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "24px 0 0",
};
