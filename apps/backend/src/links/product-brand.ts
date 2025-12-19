import BrandModule from "../modules/brand";
import ProductModule from "@medusajs/medusa/product";
import { defineLink } from "@medusajs/framework/utils";

export default defineLink(
  {
    linkable: ProductModule.linkable.product,
    isList: true,
    deleteCascade: true,
  },
  {
    linkable: BrandModule.linkable.brand,
    filterable: ["id", "name"],
  }
);
