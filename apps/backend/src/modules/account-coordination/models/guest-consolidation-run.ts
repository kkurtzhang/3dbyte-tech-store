import { model } from "@medusajs/framework/utils";

export const GuestConsolidationRun = model
  .define("guest_consolidation_run", {
    id: model.id({ prefix: "gcr" }).primaryKey(),
    canonical_customer_id: model.text(),
    normalized_email: model.text(),
    idempotency_key: model.text(),
    mode: model.text(),
    status: model.text().default("pending"),
    guest_customer_ids: model.json().nullable(),
    transferred_order_ids: model.json().nullable(),
    attached_cart_ids: model.json().nullable(),
    attached_support_ticket_ids: model.json().nullable(),
    skipped_items: model.json().nullable(),
    profile_fields_filled: model.json().nullable(),
    summary: model.json().nullable(),
    started_at: model.dateTime(),
    completed_at: model.dateTime().nullable(),
    failure_reason: model.text().nullable(),
  })
  .indexes([
    {
      name: "IDX_guest_consolidation_run_idempotency",
      on: ["idempotency_key"],
      unique: true,
    },
    {
      name: "IDX_guest_consolidation_run_customer_status",
      on: ["canonical_customer_id", "status"],
    },
  ]);
