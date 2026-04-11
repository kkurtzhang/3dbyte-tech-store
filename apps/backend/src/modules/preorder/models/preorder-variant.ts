import { model } from "@medusajs/framework/utils";
import { Preorder } from "./preorder";
import { PreorderVariantPrice } from "./preorder-variant-price";

export enum PreorderVariantStatus {
  ENABLED = "enabled",
  DISABLED = "disabled",
}

export const PreorderVariant = model.define("preorder_variant", {
  id: model.id().primaryKey(),
  variant_id: model.text().unique(),
  available_date: model.dateTime().index(),
  status: model
    .enum(Object.values(PreorderVariantStatus))
    .default(PreorderVariantStatus.ENABLED),
  prices: model.hasMany(() => PreorderVariantPrice, {
    mappedBy: "preorder_variant",
  }),
  preorders: model.hasMany(() => Preorder, {
    mappedBy: "item",
  }),
});
