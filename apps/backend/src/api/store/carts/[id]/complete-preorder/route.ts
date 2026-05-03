import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";
import { completeCartPreorderWorkflow } from "../../../../../workflows/complete-cart-preorder";

type CartLineItemForShippingProfile = {
  requires_shipping?: boolean;
  variant?: {
    product?: {
      id?: string;
      shipping_profile?: { id?: string } | null;
    } | null;
  } | null;
};

async function ensureCartProductsHaveShippingProfiles(
  req: MedusaRequest,
  cartId: string
): Promise<void> {
  const query = req.scope.resolve("query");
  const fulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT);

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "items.requires_shipping",
      "items.variant.product.id",
      "items.variant.product.shipping_profile.*",
    ],
    filters: { id: cartId },
  });

  const cart = carts?.[0];
  const missingProfileProductIds = new Set(
    ((cart?.items ?? []) as CartLineItemForShippingProfile[])
      .filter((item) => item.requires_shipping)
      .filter((item) => !item.variant?.product?.shipping_profile?.id)
      .map((item) => item.variant?.product?.id)
      .filter((productId): productId is string => Boolean(productId))
  );

  if (missingProfileProductIds.size === 0) {
    return;
  }

  const defaultProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  const defaultProfile = defaultProfiles?.[0];

  if (!defaultProfile?.id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No default shipping profile is available for cart completion"
    );
  }

  await updateProductsWorkflow(req.scope).run({
    input: {
      products: Array.from(missingProfileProductIds).map((productId) => ({
        id: productId,
        shipping_profile_id: defaultProfile.id,
      })),
    },
  });
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params;

  await ensureCartProductsHaveShippingProfiles(req, id);

  const { result } = await completeCartPreorderWorkflow(req.scope).run({
    input: {
      cart_id: id,
    },
  });

  res.json({
    type: "order",
    order: result.order,
  });
};
