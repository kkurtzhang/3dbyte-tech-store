import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  deleteLineItemsWorkflow,
  releaseLockStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import { getBundleLineItemIds } from "./utils/get-bundle-line-item-ids";

type RemoveBundleFromCartWorkflowInput = {
  bundle_id: string;
  cart_id: string;
};

export const removeBundleFromCartWorkflow = createWorkflow(
  "remove-bundle-from-cart",
  ({ bundle_id, cart_id }: RemoveBundleFromCartWorkflowInput) => {
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

    const itemsToRemove = transform(
      {
        cart: carts[0],
        bundle_id,
      },
      (data) => {
        return getBundleLineItemIds(data.cart.items, data.bundle_id);
      }
    );

    acquireLockStep({
      key: cart_id,
      timeout: 2,
      ttl: 10,
    });

    deleteLineItemsWorkflow.runAsStep({
      input: {
        cart_id,
        ids: itemsToRemove,
      },
    });

    const { data: updatedCarts } = useQueryGraphStep({
      entity: "cart",
      fields: ["*", "items.*", "items.variant.*", "items.variant.product.*"],
      filters: {
        id: cart_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({
      name: "retrieve-cart-after-bundle-removal",
    });

    releaseLockStep({
      key: cart_id,
    });

    return new WorkflowResponse(updatedCarts[0]);
  }
);
