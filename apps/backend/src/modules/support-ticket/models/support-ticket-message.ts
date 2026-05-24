import { model } from "@medusajs/framework/utils"

export const SupportTicketMessage = model.define("support_ticket_message", {
  id: model.id({ prefix: "sptmsg" }).primaryKey(),
  ticket_id: model.text(),
  author_type: model.text(),
  direction: model.text(),
  visibility: model.text().default("customer"),
  body: model.text(),
  author_name: model.text().nullable(),
  author_email: model.text().nullable(),
  metadata: model.json().nullable(),
})
