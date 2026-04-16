import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import { removeBundleFromCartWorkflow } from "../../../../../../workflows/bundled-product/remove-bundle-from-cart";
import { updateBundleInCartWorkflow } from "../../../../../../workflows/bundled-product/update-bundle-in-cart";
import { PutStoreCartLineItemBundle } from "../validators";

type PutStoreCartLineItemBundleType = z.infer<typeof PutStoreCartLineItemBundle>;

export async function PUT(
  req: MedusaRequest<PutStoreCartLineItemBundleType>,
  res: MedusaResponse
) {
  const { result: cart } = await updateBundleInCartWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id,
      bundle_id: req.params.bundle_id,
      quantity: req.validatedBody.quantity,
    },
  });

  res.json({
    cart,
  });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { result: cart } = await removeBundleFromCartWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id,
      bundle_id: req.params.bundle_id,
    },
  });

  res.json({
    cart,
  });
}
