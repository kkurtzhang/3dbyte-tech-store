import { z } from "@medusajs/framework/zod";

export const PostStoreCartLineItemBundles = z.object({
  bundle_id: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  items: z
    .array(
      z.object({
        item_id: z.string().min(1),
        variant_id: z.string().min(1),
      })
    )
    .min(1),
});

export const PutStoreCartLineItemBundle = z.object({
  quantity: z.number().int().positive(),
});
