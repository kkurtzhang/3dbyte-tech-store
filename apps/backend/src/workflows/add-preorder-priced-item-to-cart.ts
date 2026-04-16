import {
  transform,
  createWorkflow,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  addToCartWorkflow,
  releaseLockStep,
  updateLineItemInCartWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import { resolvePreorderLineItemPriceStep } from "./steps/resolve-preorder-line-item-price";
import { findMatchingCartLineItem } from "./utils/find-matching-cart-line-item";

type WorkflowInput = {
  cart_id: string;
  item: {
    variant_id: string;
    quantity: number;
    metadata?: Record<string, unknown>;
  };
};

export const addPreorderPricedItemToCartWorkflow = createWorkflow(
  "add-preorder-priced-item-to-cart",
  (input: WorkflowInput) => {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: ["id", "currency_code", "items.*"],
      filters: {
        id: input.cart_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    });

    const { data: variants } = useQueryGraphStep({
      entity: "product_variant",
      fields: ["id", "preorder_variant.*", "preorder_variant.prices.*"],
      filters: {
        id: input.item.variant_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({ name: "retrieve-variant-for-cart-pricing" });

    const preorderUnitPrice = resolvePreorderLineItemPriceStep({
      currency_code: carts[0].currency_code,
      variant: variants[0] as Parameters<
        typeof resolvePreorderLineItemPriceStep
      >[0]["variant"],
    });

    const items = transform(
      {
        item: input.item,
        preorderUnitPrice,
      },
      (data) => [
        {
          variant_id: data.item.variant_id,
          quantity: data.item.quantity,
          metadata: data.item.metadata ?? {},
          ...(typeof data.preorderUnitPrice === "number"
            ? { unit_price: data.preorderUnitPrice }
            : {}),
        },
      ]
    );

    const matchingLineItem = transform(
      {
        cart: carts[0],
        item: input.item,
      },
      (data) => {
        return findMatchingCartLineItem(
          data.cart.items,
          data.item.variant_id,
          data.item.metadata
        );
      }
    );

    const lineItemUpdate = transform(
      {
        matchingLineItem,
        item: input.item,
        preorderUnitPrice,
      },
      (data) => {
        if (!data.matchingLineItem) {
          return null;
        }

        return {
          item_id: data.matchingLineItem.id,
          update: {
            quantity: data.matchingLineItem.quantity + data.item.quantity,
            metadata: data.item.metadata ?? data.matchingLineItem.metadata ?? {},
            ...(typeof data.preorderUnitPrice === "number"
              ? { unit_price: data.preorderUnitPrice }
              : {}),
          },
        };
      }
    );

    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    });

    when({ lineItemUpdate }, ({ lineItemUpdate }) => Boolean(lineItemUpdate)).then(() => {
      updateLineItemInCartWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          item_id: lineItemUpdate.item_id,
          update: lineItemUpdate.update,
        },
      });
    });

    when({ lineItemUpdate }, ({ lineItemUpdate }) => !lineItemUpdate).then(() => {
      addToCartWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          items,
        },
      });
    });

    const { data: updatedCart } = useQueryGraphStep({
      entity: "cart",
      fields: [
        "id",
        "currency_code",
        "email",
        "region_id",
        "total",
        "subtotal",
        "tax_total",
        "discount_total",
        "discount_subtotal",
        "discount_tax_total",
        "original_total",
        "original_tax_total",
        "item_total",
        "item_subtotal",
        "item_tax_total",
        "original_item_total",
        "original_item_subtotal",
        "original_item_tax_total",
        "shipping_total",
        "shipping_subtotal",
        "shipping_tax_total",
        "original_shipping_tax_total",
        "original_shipping_subtotal",
        "original_shipping_total",
        "credit_line_subtotal",
        "credit_line_tax_total",
        "credit_line_total",
        "items.*",
        "items.product.*",
        "items.variant.*",
        "items.variant.product.*",
        "items.variant.product.images.*",
        "items.variant.preorder_variant.*",
        "items.variant.preorder_variant.prices.*",
        "region.*",
        "promotions.*",
      ],
      filters: {
        id: input.cart_id,
      },
    }).config({ name: "refetch-cart-with-preorder-prices" });

    releaseLockStep({
      key: input.cart_id,
    });

    return new WorkflowResponse({
      cart: updatedCart[0],
    });
  }
);
