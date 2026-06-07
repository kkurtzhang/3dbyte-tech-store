import { model } from "@medusajs/framework/utils";

export const OAuthLinkIntent = model
  .define("oauth_link_intent", {
    id: model.id({ prefix: "oli" }).primaryKey(),
    customer_id: model.text(),
    expected_email: model.text(),
    nonce_hash: model.text(),
    status: model.text().default("pending"),
    expires_at: model.dateTime(),
    used_at: model.dateTime().nullable(),
    failure_count: model.number().default(0),
    last_failure_reason: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_oauth_link_intent_customer_status",
      on: ["customer_id", "status"],
    },
    {
      name: "IDX_oauth_link_intent_status_expires",
      on: ["status", "expires_at"],
    },
  ]);
