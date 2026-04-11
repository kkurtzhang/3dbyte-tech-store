import { model } from "@medusajs/framework/utils";
import { PreorderVariant } from "./preorder-variant";

export const PreorderVariantPrice = model
  .define("preorder_variant_price", {
    id: model.id().primaryKey(),
    currency_code: model.text(),
    amount: model.bigNumber(),
    preorder_variant: model.belongsTo(() => PreorderVariant, {
      mappedBy: "prices",
    }),
  })
  .indexes([
    {
      on: ["preorder_variant_id", "currency_code"],
      unique: true,
    },
  ]);
