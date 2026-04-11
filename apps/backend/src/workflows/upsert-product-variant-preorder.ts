import { Modules } from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { createRemoteLinkStep, useQueryGraphStep } from "@medusajs/medusa/core-flows";
import { PREORDER_MODULE } from "../modules/preorder";
import { PreorderVariantStatus } from "../modules/preorder/models/preorder-variant";
import { createPreorderVariantStep } from "./steps/create-preorder-variant";
import {
  PreorderPriceInput,
  syncPreorderVariantPricesStep,
} from "./steps/sync-preorder-variant-prices";
import { updatePreorderVariantStep } from "./steps/update-preorder-variant";

type WorkflowInput = {
  variant_id: string;
  available_date: Date;
  prices: PreorderPriceInput[];
};

export const upsertProductVariantPreorderWorkflow = createWorkflow(
  "upsert-product-variant-preorder",
  (input: WorkflowInput) => {
    useQueryGraphStep({
      entity: "product_variant",
      fields: ["id"],
      filters: {
        id: input.variant_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    });

    const { data: preorderVariants } = useQueryGraphStep({
      entity: "preorder_variant",
      fields: ["*", "prices.*"],
      filters: {
        variant_id: input.variant_id,
      },
    }).config({ name: "retrieve-preorder-variant" });

    const updatedPreorderVariant = when(
      { preorderVariants },
      (data) => data.preorderVariants.length > 0
    ).then(() => {
      return updatePreorderVariantStep({
        id: preorderVariants[0].id,
        variant_id: input.variant_id,
        available_date: input.available_date,
        status: PreorderVariantStatus.ENABLED,
      });
    });

    const createdPreorderVariant = when(
      { preorderVariants },
      (data) => data.preorderVariants.length === 0
    ).then(() => {
      const preorderVariant = createPreorderVariantStep({
        variant_id: input.variant_id,
        available_date: input.available_date,
      });

      createRemoteLinkStep([
        {
          [PREORDER_MODULE]: {
            preorder_variant_id: preorderVariant.id,
          },
          [Modules.PRODUCT]: {
            product_variant_id: preorderVariant.variant_id,
          },
        },
      ]);

      return preorderVariant;
    });

    const createdPreorderVariantId = transform(
      { createdPreorderVariant },
      (data) => data.createdPreorderVariant?.id
    );

    const syncedUpdatedPrices = when(
      { preorderVariants },
      (data) => data.preorderVariants.length > 0
    ).then(() =>
      syncPreorderVariantPricesStep({
        preorder_variant_id: preorderVariants[0].id,
        prices: input.prices,
      }).config({ name: "sync-updated-preorder-variant-prices" })
    );

    const syncedCreatedPrices = when(
      { createdPreorderVariantId },
      (data) => Boolean(data.createdPreorderVariantId)
    ).then(() =>
      syncPreorderVariantPricesStep({
        preorder_variant_id: createdPreorderVariantId,
        prices: input.prices,
      }).config({ name: "sync-created-preorder-variant-prices" })
    );

    const preorderVariant = transform(
      {
        preorderVariants,
        updatedPreorderVariant,
        createdPreorderVariant,
        syncedUpdatedPrices,
        syncedCreatedPrices,
      },
      (data) => {
        const existingPreorderVariant = data.preorderVariants[0] as
          | { prices?: PreorderPriceInput[] }
          | undefined;
        const prices =
          data.syncedCreatedPrices ||
          data.syncedUpdatedPrices ||
          existingPreorderVariant?.prices ||
          [];

        const basePreorderVariant =
          data.createdPreorderVariant || data.updatedPreorderVariant;

        return {
          ...basePreorderVariant,
          prices,
        };
      }
    );

    return new WorkflowResponse(preorderVariant);
  }
);
