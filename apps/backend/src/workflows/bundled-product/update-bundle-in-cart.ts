import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  releaseLockStep,
  updateLineItemsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import { buildBundleLineItemUpdates } from "./utils/build-bundle-line-item-updates";

type UpdateBundleInCartWorkflowInput = {
  bundle_id: string;
  cart_id: string;
  quantity: number;
};

export const updateBundleInCartWorkflow = createWorkflow(
  "update-bundle-in-cart",
  ({ bundle_id, cart_id, quantity }: UpdateBundleInCartWorkflowInput) => {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "items.*"],
      filters: {
        id: cart_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    });

    const lineItemUpdates = transform(
      {
        cart: carts[0],
        bundle_id,
        quantity,
      },
      (data) => {
        return buildBundleLineItemUpdates(
          data.cart.items,
          data.bundle_id,
          data.quantity
        );
      }
    );

    acquireLockStep({
      key: cart_id,
      timeout: 2,
      ttl: 10,
    });

    updateLineItemsStep({
      id: cart_id,
      items: lineItemUpdates,
    });

    const { data: updatedCarts } = useQueryGraphStep({
      entity: "cart",
      filters: {
        id: cart_id,
      },
      fields: ["*", "items.*", "items.variant.*", "items.variant.product.*"],
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({
      name: "retrieve-cart-after-bundle-update",
    });

    releaseLockStep({
      key: cart_id,
    });

    return new WorkflowResponse(updatedCarts[0]);
  }
);
