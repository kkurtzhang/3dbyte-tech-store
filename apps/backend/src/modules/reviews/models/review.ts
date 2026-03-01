import { model } from "@medusajs/framework/utils";

export const Review = model.define("review", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  product_id: model.text(),
  product_variant_id: model.text().nullable(),
  rating: model.number(),
  title: model.text(),
  content: model.text(),
  helpful_count: model.number().default(0),
  verified_purchase: model.boolean().default(false),
});
