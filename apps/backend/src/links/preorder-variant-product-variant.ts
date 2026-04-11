import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import PreorderModule from "../modules/preorder";

export default defineLink(
  PreorderModule.linkable.preorderVariant,
  ProductModule.linkable.productVariant
);
