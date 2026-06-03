import {
  Body,
  Button,
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
import { getSafePaymentMethodDisplay } from "@3dbyte-tech-store/shared-utils";

import {
  areEmailAddressesEqual,
  formatEmailAddress,
  formatEmailDate,
  formatEmailMoney,
} from "../formatters";
import { EMAIL_BRAND_LOGO_ALT, getEmailBrandLogoUrl } from "../brand-assets";
import {
  buildOrderPlacedEmailItemGroups,
  getCustomerOrderNumber,
  getCustomerSummarySubtotal,
  getCustomerStoreName,
  getItemLineTotal,
  getItemQuantity,
  getItemReleaseDate,
  getItemTitle,
  getItemUnitPrice,
  getItemVariantText,
  getOrderDiscountTotal,
  getOrderShippingTotal,
  getOrderTaxTotal,
  getOrderTotal,
  getOrderTrackingUrl,
  getShippingMethodName,
  type OrderPlacedEmailItemGroup,
} from "../order-placed-data";
import type {
  OrderPlacedEmailItem,
  OrderPlacedEmailOrder,
  OrderPlacedEmailStore,
} from "../types";

type Props = {
  order: OrderPlacedEmailOrder;
  store: OrderPlacedEmailStore;
};

type BundleEmailItemGroup = Extract<
  OrderPlacedEmailItemGroup,
  { type: "bundle" }
>;

const formatDiscount = (
  amount: number | null | undefined,
  currencyCode: string,
): string => `-${formatEmailMoney(Math.abs(amount ?? 0), currencyCode)}`;

export default function OrderPlacedEmail({ order, store }: Props) {
  const storeName = getCustomerStoreName(store);
  const orderNumber = getCustomerOrderNumber(order);
  const itemGroups = buildOrderPlacedEmailItemGroups(order.items);
  const trackingUrl = getOrderTrackingUrl(order);
  const shippingAddressLines = formatEmailAddress(order.shipping_address);
  const billingAddressLines = areEmailAddressesEqual(
    order.shipping_address,
    order.billing_address,
  )
    ? ["Same as shipping address"]
    : formatEmailAddress(order.billing_address);
  const shippingMethodName = getShippingMethodName(order);
  const paymentMethodDisplay = getSafePaymentMethodDisplay(order);
  const discountTotal = getOrderDiscountTotal(order);

  return (
    <Html>
      <Head />
      <Preview>
        Your {storeName} order {orderNumber} has been received
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
          <Heading style={headingStyle}>
            Thanks, we have received your order.
          </Heading>
          <Text style={introStyle}>
            Hi {order.shipping_address?.first_name || "there"}, your order from{" "}
            {storeName} was placed on {formatEmailDate(order.created_at)}. We
            will send another email when the order is on its way.
          </Text>
          <Button href={trackingUrl} style={buttonStyle}>
            Track your order
          </Button>

          <Section style={sectionStyle}>
            <Heading as="h2" style={sectionHeadingStyle}>
              Items
            </Heading>
            {itemGroups.map((group) =>
              group.type === "bundle" ? (
                <EmailBundleGroup
                  key={group.bundleId}
                  currencyCode={order.currency_code}
                  group={group}
                />
              ) : (
                <EmailItemRow
                  key={group.item.id}
                  currencyCode={order.currency_code}
                  item={group.item}
                />
              ),
            )}
          </Section>

          <Section style={sectionStyle}>
            <Heading as="h2" style={sectionHeadingStyle}>
              Delivery
            </Heading>
            {shippingMethodName ? (
              <Text style={summaryTextStyle}>
                Shipping method: {shippingMethodName}
              </Text>
            ) : null}
            <Text style={summaryTextStyle}>
              Payment method: {paymentMethodDisplay}
            </Text>
            <Row>
              <Column style={addressColumnStyle}>
                <Text style={addressHeadingStyle}>Shipping address</Text>
                {shippingAddressLines.map((line) => (
                  <Text key={line} style={addressLineStyle}>
                    {line}
                  </Text>
                ))}
              </Column>
              <Column style={addressColumnStyle}>
                <Text style={addressHeadingStyle}>Billing address</Text>
                {billingAddressLines.map((line) => (
                  <Text key={line} style={addressLineStyle}>
                    {line}
                  </Text>
                ))}
              </Column>
            </Row>
          </Section>

          <Section style={sectionStyle}>
            <Heading as="h2" style={sectionHeadingStyle}>
              Order Summary
            </Heading>
            <SummaryLine
              label="Subtotal"
              value={formatEmailMoney(
                getCustomerSummarySubtotal(order),
                order.currency_code,
              )}
            />
            {discountTotal !== 0 ? (
              <SummaryLine
                label="Discount"
                value={formatDiscount(discountTotal, order.currency_code)}
              />
            ) : null}
            <SummaryLine
              label="Shipping"
              value={formatEmailMoney(
                getOrderShippingTotal(order),
                order.currency_code,
              )}
            />
            <Hr style={dividerStyle} />
            <SummaryLine
              label={`Total (${order.currency_code.toUpperCase()})`}
              value={formatEmailMoney(
                getOrderTotal(order),
                order.currency_code,
              )}
              strong
            />
            <Text style={includedGstStyle}>
              (Includes GST:{" "}
              {formatEmailMoney(getOrderTaxTotal(order), order.currency_code)})
            </Text>
          </Section>

          <Text style={footerStyle}>
            Need help with this order? Reply to this email and include order{" "}
            {orderNumber}, or track it anytime at {trackingUrl}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const getBundleItemTitle = (item: OrderPlacedEmailItem): string => {
  const variantText = getItemVariantText(item);

  return variantText
    ? `${getItemTitle(item)} - ${variantText}`
    : getItemTitle(item);
};

const getBundleLineTotal = (items: OrderPlacedEmailItem[]): number =>
  items.reduce((sum, item) => sum + getItemLineTotal(item), 0);

function EmailBundleGroup({
  currencyCode,
  group,
}: {
  currencyCode: string;
  group: BundleEmailItemGroup;
}) {
  return (
    <Section style={bundleGroupStyle}>
      <Row>
        <Column style={bundleDetailsColumnStyle}>
          <Text style={bundleTitleStyle}>
            {group.bundleTitle ?? "Product Bundle"}
          </Text>
          <Text style={mutedTextStyle}>Qty {group.quantity}</Text>
        </Column>
        <Column style={moneyColumnStyle}>
          <Text style={itemPriceStyle}>
            {formatEmailMoney(getBundleLineTotal(group.items), currencyCode)}
          </Text>
        </Column>
      </Row>
      <Text style={includesHeadingStyle}>Includes</Text>
      {group.items.map((item) => {
        const releaseDate = getItemReleaseDate(item);

        return (
          <Text key={item.id} style={includesLineStyle}>
            {getItemQuantity(item)} x {getBundleItemTitle(item)}
            {releaseDate ? ` (releases ${formatEmailDate(releaseDate)})` : ""}
          </Text>
        );
      })}
    </Section>
  );
}

function EmailItemRow({
  currencyCode,
  item,
}: {
  currencyCode: string;
  item: OrderPlacedEmailItem;
}) {
  const releaseDate = getItemReleaseDate(item);
  const lineTotal = getItemLineTotal(item);
  const unitPrice = getItemUnitPrice(item);

  return (
    <Row style={itemRowStyle}>
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
      <Column style={itemDetailsColumnStyle}>
        <Text style={itemTitleStyle}>{getItemTitle(item)}</Text>
        {getItemVariantText(item) ? (
          <Text style={mutedTextStyle}>{getItemVariantText(item)}</Text>
        ) : null}
        <Text style={mutedTextStyle}>
          Qty {getItemQuantity(item)} x{" "}
          {formatEmailMoney(unitPrice, currencyCode)}
        </Text>
        {releaseDate ? (
          <Text style={releaseDateStyle}>
            Pre-order: releases {formatEmailDate(releaseDate)}
          </Text>
        ) : null}
      </Column>
      <Column style={moneyColumnStyle}>
        <Text style={itemPriceStyle}>
          {formatEmailMoney(lineTotal, currencyCode)}
        </Text>
      </Column>
    </Row>
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
        <Text style={strong ? summaryStrongTextStyle : summaryTextStyle}>
          {label}
        </Text>
      </Column>
      <Column style={moneyColumnStyle}>
        <Text style={strong ? summaryStrongTextStyle : summaryTextStyle}>
          {value}
        </Text>
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

const brandLogoStyle = {
  display: "block",
  height: "auto",
  margin: "0 0 24px",
  maxWidth: "180px",
  width: "180px",
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
  margin: "0 0 18px",
};

const buttonStyle = {
  backgroundColor: "#0f172a",
  borderRadius: "4px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "700",
  lineHeight: "20px",
  margin: "0 0 24px",
  padding: "11px 18px",
  textDecoration: "none",
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

const bundleGroupStyle = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e5e7eb",
  margin: "0 0 12px",
  padding: "12px",
};

const bundleTitleStyle = {
  fontSize: "14px",
  fontWeight: "700",
  lineHeight: "20px",
  margin: "0 0 2px",
};

const bundleDetailsColumnStyle = {
  padding: "0 10px 0 0",
};

const includesHeadingStyle = {
  color: "#374151",
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: "18px",
  margin: "10px 0 4px",
};

const includesLineStyle = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "18px",
  margin: "0 0 3px",
};

const thumbnailColumnStyle = {
  width: "48px",
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

const itemDetailsColumnStyle = {
  padding: "0 10px",
};

const mutedTextStyle = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "18px",
  margin: "0",
};

const releaseDateStyle = {
  color: "#0e7490",
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: "18px",
  margin: "4px 0 0",
};

const moneyColumnStyle = {
  textAlign: "right" as const,
  width: "96px",
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

const includedGstStyle = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "4px 0 0",
  textAlign: "right" as const,
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
