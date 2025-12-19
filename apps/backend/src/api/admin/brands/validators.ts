import z from "zod";

export const PostAdminCreateBrand = z.object({
  name: z.string(),
  handle: z.string(),
});

export const PostAdminUpdateBrand = z.object({
  name: z.string(),
  handle: z.string(),
});

export const PostAdminLinkProductsToBrand = z.object({
  products: z.array(z.string()),
});

export const DeleteAdminLinkProductsBrand = PostAdminLinkProductsToBrand;

export const DeleteAdminBatchLinkProductsBrand = z.object({
  ids: z.array(
    z.object({
      product_id: z.string(),
      brand_id: z.string(),
    })
  ),
});
