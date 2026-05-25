import { model } from "@medusajs/framework/utils"

export const SupportTicketEvent = model.define("support_ticket_event", {
  id: model.id({ prefix: "sptevt" }).primaryKey(),
  ticket_id: model.text(),
  type: model.text(),
  from_value: model.text().nullable(),
  to_value: model.text().nullable(),
  actor_type: model.text().default("system"),
  actor_id: model.text().nullable(),
  metadata: model.json().nullable(),
})
