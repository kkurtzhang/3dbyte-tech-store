import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import { addBundleToCartWorkflow } from "../../../../../workflows/bundled-product/add-bundle-to-cart";
import { PostStoreCartLineItemBundles } from "./validators";

type PostStoreCartLineItemBundlesType = z.infer<
  typeof PostStoreCartLineItemBundles
>;

export async function POST(
  req: MedusaRequest<PostStoreCartLineItemBundlesType>,
  res: MedusaResponse
) {
  const { result: cart } = await addBundleToCartWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id,
      bundle_id: req.validatedBody.bundle_id,
      quantity: req.validatedBody.quantity,
      items: req.validatedBody.items,
    },
  });

  res.json({
    cart,
  });
}
