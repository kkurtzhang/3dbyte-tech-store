import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import { addPreorderPricedItemToCartWorkflow } from "../../../../../workflows/add-preorder-priced-item-to-cart";

export const AddPricedLineItemSchema = z.object({
  variant_id: z.string(),
  quantity: z.coerce.number().int().positive().default(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type AddPricedLineItemSchema = z.infer<typeof AddPricedLineItemSchema>;

export const POST = async (
  req: MedusaRequest<AddPricedLineItemSchema>,
  res: MedusaResponse
) => {
  const { result } = await addPreorderPricedItemToCartWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id,
      item: req.validatedBody,
    },
  });

  res.json({
    cart: result.cart,
  });
};
