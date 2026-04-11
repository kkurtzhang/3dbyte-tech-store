import { CartLineItemDTO, ProductVariantDTO } from "@medusajs/framework/types";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

export type RetrievePreorderItemIdsStepInput = {
  line_items: (CartLineItemDTO & {
    variant: ProductVariantDTO & {
      preorder_variant?: {
        id: string;
      };
    };
  })[];
};

export function retrievePreorderVariantIds(
  lineItems: RetrievePreorderItemIdsStepInput["line_items"]
): string[] {
  const variantIds = new Set<string>();

  lineItems.forEach((item) => {
    if (item.variant.preorder_variant) {
      variantIds.add(item.variant.preorder_variant.id);
    }
  });

  return [...variantIds];
}

export const retrievePreorderItemIdsStep = createStep(
  "retrieve-preorder-item-ids",
  async ({ line_items }: RetrievePreorderItemIdsStepInput) => {
    return new StepResponse(retrievePreorderVariantIds(line_items));
  }
);
