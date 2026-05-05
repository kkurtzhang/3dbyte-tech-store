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
  "subtotal",
  "item_subtotal",
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

const isTruthyEnvValue = (value: string | undefined): boolean =>
  value?.toLowerCase() === "true";

const isDevelopmentEnv = (
  env: Partial<Record<string, string | undefined>>,
): boolean => (env.NODE_ENV || "development") === "development";

const isMaildevEmailProviderConfigured = (
  env: Partial<Record<string, string | undefined>>,
): boolean => {
  if (env.MAILDEV_ENABLED !== undefined) {
    return isTruthyEnvValue(env.MAILDEV_ENABLED);
  }

  return isDevelopmentEnv(env);
};

const isCompatibleEmailProviderConfigured = (
  env: Partial<Record<string, string | undefined>>,
): boolean => isMaildevEmailProviderConfigured(env);

const isOrderEmailFlagEnabled = (
  env: Partial<Record<string, string | undefined>>,
): boolean => {
  if (env.ORDER_EMAILS_ENABLED !== undefined) {
    return isTruthyEnvValue(env.ORDER_EMAILS_ENABLED);
  }

  return isDevelopmentEnv(env);
};

export const areOrderEmailsEnabled = (
  env: Partial<Record<string, string | undefined>> = process.env,
): boolean => {
  return isOrderEmailFlagEnabled(env) && isCompatibleEmailProviderConfigured(env);
};

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedEvent>) {
  if (!areOrderEmailsEnabled()) {
    return;
  }

  const query = container.resolve("query");

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

  const notificationModule = container.resolve("notification");
  const content = await renderOrderPlacedEmail({
    order: order as unknown as OrderPlacedEmailOrder,
    store: {
      name: store?.name,
    },
  });

  await notificationModule.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-placed",
    idempotency_key: `order-placed/${order.id}`,
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
