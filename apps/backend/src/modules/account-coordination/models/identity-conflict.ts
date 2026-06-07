import { model } from "@medusajs/framework/utils";

export const IdentityConflict = model
  .define("identity_conflict", {
    id: model.id({ prefix: "icf" }).primaryKey(),
    customer_id: model.text().nullable(),
    normalized_email: model.text().nullable(),
    provider: model.text().nullable(),
    issue_type: model.text(),
    status: model.text().default("open"),
    occurrence_count: model.number().default(1),
    last_seen_at: model.dateTime(),
    details: model.json().nullable(),
    resolved_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      name: "IDX_identity_conflict_status_type",
      on: ["status", "issue_type"],
    },
    {
      name: "IDX_identity_conflict_email_provider",
      on: ["normalized_email", "provider"],
    },
  ]);
