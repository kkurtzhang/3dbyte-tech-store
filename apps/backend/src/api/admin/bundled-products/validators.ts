import { z } from "@medusajs/framework/zod";
import { AdminCreateProduct } from "@medusajs/medusa/api/admin/products/validators";

export const PostAdminCreateBundledProduct = z.object({
  title: z.string().min(1),
  product: AdminCreateProduct(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});
