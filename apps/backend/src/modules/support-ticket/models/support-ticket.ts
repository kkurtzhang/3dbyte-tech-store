import { model } from "@medusajs/framework/utils"

export const SupportTicket = model.define("support_ticket", {
  id: model.id({ prefix: "spt" }).primaryKey(),
  ticket_number: model.text(),
  status: model.text().default("new"),
  priority: model.text().default("normal"),
  category: model.text().default("general"),
  source: model.text().default("contact_form"),
  subject: model.text(),
  customer_name: model.text(),
  customer_email: model.text(),
  customer_id: model.text().nullable(),
  order_id: model.text().nullable(),
  order_reference: model.text().nullable(),
  product_id: model.text().nullable(),
  product_handle: model.text().nullable(),
  assigned_admin_id: model.text().nullable(),
  ai_summary: model.text().nullable(),
  metadata: model.json().nullable(),
  last_message_at: model.dateTime().nullable(),
  resolved_at: model.dateTime().nullable(),
  closed_at: model.dateTime().nullable(),
})
