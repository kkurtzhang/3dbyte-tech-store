import { model } from "@medusajs/framework/utils";

export const WaitlistEntry = model.define("waitlist_entry", {
  id: model.id().primaryKey(),
  customer_id: model.text().nullable(),
  customer_email: model.text(),
  product_id: model.text(),
  product_variant_id: model.text().nullable(),
  product_handle: model.text(),
  product_title: model.text(),
  variant_title: model.text().nullable(),
  notified: model.boolean().default(false),
  notified_at: model.dateTime().nullable(),
  last_notified_at: model.dateTime().nullable(),
  notification_count: model.number().default(0),
});
