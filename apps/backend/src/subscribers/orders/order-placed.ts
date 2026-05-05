import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";

import { renderOrderPlacedEmail } from "../../emails/renderers/order-placed";
import type { OrderPlacedEmailOrder } from "../../emails/types";

type OrderPlacedEvent = {
  id: string;
};

const orderFields = [
  "id",
  "email",
  "display_id",
  "created_at",
  "currency_code",
  "item_total",
  "shipping_total",
  "discount_total",
  "tax_total",
  "total",
  "items.id",
  "items.product_title",
  "items.variant_title",
  "items.quantity",
  "items.unit_price",
  "items.thumbnail",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.postal_code",
  "shipping_address.country_code",
];

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedEvent>) {
  const query = container.resolve("query");
  const notificationModule = container.resolve("notification");

  const {
    data: [store],
  } = await query.graph({
    entity: "store",
    fields: ["name"],
  });

  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: orderFields,
    filters: {
      id: data.id,
    },
  });

  if (!order?.email) {
    return;
  }

  const content = await renderOrderPlacedEmail({
    order: order as OrderPlacedEmailOrder,
    store: {
      name: store?.name,
    },
  });

  await notificationModule.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-placed",
    content,
    data: {
      order,
      email_metadata: {
        entity_id: order.id,
        event: "order.placed",
        idempotency_key: `order-placed/${order.id}`,
      },
    },
  });
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
