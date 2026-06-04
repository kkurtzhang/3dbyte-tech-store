import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";

import { renderCustomerPasswordResetEmail } from "../emails/renderers/customer-password-reset";
import { resolveSenderProfileFromContainer } from "../lib/email-settings/sender-profiles";

type AuthPasswordResetEvent = {
  actor_type?: string;
  entity_id?: string;
  token?: string;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/$/, "");

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const getStorefrontUrl = (): string => {
  const rawValue =
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SERVICE_URL_STOREFRONT ||
    process.env.SERVICE_FQDN_STOREFRONT ||
    "http://localhost:3001";
  const value = trimTrailingSlash(rawValue);

  return /^https?:\/\//.test(value) ? value : `https://${value}`;
};

const getResetPasswordUrl = ({
  email,
  token,
}: {
  email: string;
  token: string;
}): string => {
  const url = new URL("/reset-password", getStorefrontUrl());
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);

  return url.toString();
};

const getStoreName = async (
  container: SubscriberArgs<AuthPasswordResetEvent>["container"],
): Promise<string> => {
  try {
    const query = container.resolve("query");
    const {
      data: [store],
    } = await query.graph({
      entity: "store",
      fields: ["name"],
    });

    return typeof store?.name === "string" && store.name.trim()
      ? store.name.trim()
      : "3D Byte Tech";
  } catch {
    return "3D Byte Tech";
  }
};

export default async function authPasswordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<AuthPasswordResetEvent>) {
  if (data.actor_type !== "customer") {
    return;
  }

  if (!data.entity_id || !data.token) {
    container
      .resolve("logger")
      .warn("password-reset subscriber: missing customer email or token");
    return;
  }

  const email = normalizeEmail(data.entity_id);
  const resetPasswordUrl = getResetPasswordUrl({
    email,
    token: data.token,
  });
  const storeName = await getStoreName(container);
  const content = await renderCustomerPasswordResetEmail({
    customerEmail: email,
    resetPasswordUrl,
    storeName,
  });
  const notificationModule = container.resolve("notification");
  const senderProfile = await resolveSenderProfileFromContainer(
    container,
    "default",
  );
  const idempotencyKey = `password-reset/${email}/${Date.now()}`;

  await notificationModule.createNotifications({
    to: email,
    channel: "email",
    template: "password-reset",
    from: senderProfile.from,
    provider_data: {
      reply_to: senderProfile.reply_to,
    },
    idempotency_key: idempotencyKey,
    content,
    data: {
      email_metadata: {
        actor_type: "customer",
        entity_id: email,
        event: "auth.password_reset",
        idempotency_key: idempotencyKey,
      },
    },
  });
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
};
