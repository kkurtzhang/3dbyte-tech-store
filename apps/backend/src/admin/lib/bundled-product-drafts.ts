import { HttpTypes } from "@medusajs/framework/types";

export type BundledProductDraftSelectedProduct = Pick<
  HttpTypes.AdminProduct,
  "id" | "title"
>;

export type BundledProductDraftItem = {
  id: string;
  product_id?: string;
  quantity: number;
  selected_product?: BundledProductDraftSelectedProduct;
};

export const createBundledProductDraftItem = (
  id: string,
): BundledProductDraftItem => ({
  id,
  product_id: undefined,
  quantity: 1,
});

export const getBundledProductDraftItemKey = (
  item: BundledProductDraftItem,
  index: number,
): string => item.id || `bundle-item-${index}`;
