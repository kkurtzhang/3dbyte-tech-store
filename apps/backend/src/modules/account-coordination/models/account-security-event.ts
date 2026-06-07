import { model } from "@medusajs/framework/utils";

export const AccountSecurityEvent = model
  .define("account_security_event", {
    id: model.id({ prefix: "ase" }).primaryKey(),
    customer_id: model.text().nullable(),
    event_type: model.text(),
    provider: model.text().nullable(),
    severity: model.text().default("info"),
    ip_hash: model.text().nullable(),
    user_agent_hash: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_account_security_event_customer_created",
      on: ["customer_id", "created_at"],
    },
    {
      name: "IDX_account_security_event_type_created",
      on: ["event_type", "created_at"],
    },
  ]);
