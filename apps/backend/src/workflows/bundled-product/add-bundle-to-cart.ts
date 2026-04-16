import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { QueryContext } from "@medusajs/framework/utils";
import {
  acquireLockStep,
  addToCartWorkflow,
  releaseLockStep,
  updateLineItemsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import {
  prepareBundleCartDataStep,
  PrepareBundleCartDataStepInput,
} from "./steps/prepare-bundle-cart-data";
import { buildBundleCartAdditionUpdates } from "./utils/build-bundle-cart-addition-updates";

type AddBundleToCartWorkflowInput = {
  cart_id: string;
  bundle_id: string;
  quantity: number;
  items: {
    item_id: string;
    variant_id: string;
  }[];
};

export const addBundleToCartWorkflow = createWorkflow(
  "add-bundle-to-cart",
  ({ cart_id, bundle_id, quantity, items }: AddBundleToCartWorkflowInput) => {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: ["id", "currency_code", "region_id", "items.*"],
      filters: {
        id: cart_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({
      name: "get-cart",
    });

    const { data } = useQueryGraphStep({
      entity: "bundle",
      fields: [
        "id",
        "title",
        "product.*",
        "product.variants.*",
        "product.variants.prices.*",
        "product.variants.calculated_price.*",
        "items.*",
        "items.product.*",
        "items.product.variants.*",
        "items.product.variants.prices.*",
        "items.product.variants.calculated_price.*",
      ],
      filters: {
        id: bundle_id,
      },
      context: {
        product: {
          variants: {
            calculated_price: QueryContext({
              currency_code: carts[0].currency_code,
              region_id: carts[0].region_id,
            }),
          },
        },
        items: {
          product: {
            variants: {
              calculated_price: QueryContext({
                currency_code: carts[0].currency_code,
                region_id: carts[0].region_id,
              }),
            },
          },
        },
      },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({
      name: "get-bundle",
    });

    const itemsToAdd = prepareBundleCartDataStep({
      bundle: data[0],
      quantity,
      items,
    } as unknown as PrepareBundleCartDataStepInput);

    acquireLockStep({
      key: cart_id,
      timeout: 2,
      ttl: 10,
    });

    const lineItemUpdates = transform(
      {
        cart: carts[0],
        itemsToAdd,
      },
      (data) => {
        return buildBundleCartAdditionUpdates(
          data.cart.items,
          data.itemsToAdd
        );
      }
    );

    when({ lineItemUpdates }, ({ lineItemUpdates }) => Boolean(lineItemUpdates)).then(() => {
      updateLineItemsStep({
        id: cart_id,
        items: lineItemUpdates,
      });
    });

    when({ lineItemUpdates }, ({ lineItemUpdates }) => !lineItemUpdates).then(() => {
      addToCartWorkflow.runAsStep({
        input: {
          cart_id,
          items: itemsToAdd,
        },
      });
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
      name: "refetch-cart",
    });

    releaseLockStep({
      key: cart_id,
    });

    return new WorkflowResponse(updatedCarts[0]);
  }
);
