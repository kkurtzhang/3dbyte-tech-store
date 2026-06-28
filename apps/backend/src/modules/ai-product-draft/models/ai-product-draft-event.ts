import { model } from "@medusajs/framework/utils"

export const AiProductDraftEvent = model.define("ai_product_draft_event", {
  id: model.id({ prefix: "aipdevt" }).primaryKey(),
  draft_id: model.text(),
  type: model.text(),
  actor_type: model.text().default("system"),
  actor_id: model.text().nullable(),
  from_status: model.text().nullable(),
  to_status: model.text().nullable(),
  metadata: model.json().nullable(),
})
