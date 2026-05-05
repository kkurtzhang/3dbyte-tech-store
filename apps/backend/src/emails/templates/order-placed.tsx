import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import {
  formatEmailAddress,
  formatEmailDate,
  formatEmailMoney,
} from "../formatters";
import type { OrderPlacedEmailOrder, OrderPlacedEmailStore } from "../types";

type Props = {
  order: OrderPlacedEmailOrder;
  store: OrderPlacedEmailStore;
};

export default function OrderPlacedEmail({ order, store }: Props) {
  const storeName = store.name || "3D Byte Tech";
  const items = order.items || [];
  const addressLines = formatEmailAddress(order.shipping_address);

  return (
    <Html>
      <Head />
      <Preview>Thank you for your order from {storeName}</Preview>
      <Body style={{ backgroundColor: "#f6f7f9", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "24px auto", padding: "24px", maxWidth: "640px" }}>
          <Heading style={{ fontSize: "22px", margin: "0 0 16px" }}>
            Order confirmation
          </Heading>
          <Text>Thank you for your order from {storeName}.</Text>
          <Text>
            Order #{order.display_id} was placed on {formatEmailDate(order.created_at)}.
          </Text>

          <Section>
            <Heading as="h2" style={{ fontSize: "16px" }}>Items</Heading>
            {items.map((item) => (
              <Text key={item.id}>
                {item.quantity} x {item.product_title || "Product"}
                {item.variant_title ? ` (${item.variant_title})` : ""} -{" "}
                {formatEmailMoney(item.unit_price * item.quantity, order.currency_code)}
              </Text>
            ))}
          </Section>

          <Section>
            <Heading as="h2" style={{ fontSize: "16px" }}>Shipping address</Heading>
            {addressLines.map((line) => (
              <Text key={line} style={{ margin: "2px 0" }}>{line}</Text>
            ))}
          </Section>

          <Section>
            <Heading as="h2" style={{ fontSize: "16px" }}>Order summary</Heading>
            <Text>Subtotal: {formatEmailMoney(order.item_total, order.currency_code)}</Text>
            <Text>Shipping: {formatEmailMoney(order.shipping_total, order.currency_code)}</Text>
            <Text>Tax: {formatEmailMoney(order.tax_total, order.currency_code)}</Text>
            <Text>Total: {formatEmailMoney(order.total, order.currency_code)}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
