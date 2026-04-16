import { CreateProductWorkflowInputDTO } from "@medusajs/framework/types";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  createRemoteLinkStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import { BUNDLED_PRODUCT_MODULE } from "../../modules/bundled-product";
import { syncProductsWorkflow } from "../meilisearch";
import { createBundleStep } from "./steps/create-bundle";
import { createBundleItemsStep } from "./steps/create-bundle-items";

export type CreateBundledProductWorkflowInput = {
  bundle: {
    title: string;
    product: CreateProductWorkflowInputDTO;
    items: {
      product_id: string;
      quantity: number;
    }[];
  };
};

export const createBundledProductWorkflow = createWorkflow(
  "create-bundled-product",
  ({ bundle: bundleData }: CreateBundledProductWorkflowInput) => {
    const bundle = createBundleStep({
      title: bundleData.title,
    });

    const bundleItems = createBundleItemsStep({
      bundle_id: bundle.id,
      items: bundleData.items,
    });

    const bundleProduct = createProductsWorkflow.runAsStep({
      input: {
        products: [bundleData.product],
      },
    });

    createRemoteLinkStep([
      {
        [BUNDLED_PRODUCT_MODULE]: {
          bundle_id: bundle.id,
        },
        [Modules.PRODUCT]: {
          product_id: bundleProduct[0].id,
        },
      },
    ]);

    const bundleItemProductLinks = transform(
      {
        bundleData,
        bundleItems,
      },
      (data) => {
        return data.bundleItems.map((item, index) => ({
          [BUNDLED_PRODUCT_MODULE]: {
            bundle_item_id: item.id,
          },
          [Modules.PRODUCT]: {
            product_id: data.bundleData.items[index].product_id,
          },
        }));
      }
    );

    createRemoteLinkStep(bundleItemProductLinks).config({
      name: "create-bundle-product-item-links",
    });

    syncProductsWorkflow.runAsStep({
      input: {
        filters: {
          id: [bundleProduct[0].id],
        },
      },
    });

    const { data } = useQueryGraphStep({
      entity: "bundle",
      fields: ["*", "items.*", "product.*"],
      filters: {
        id: bundle.id,
      },
    }).config({
      name: "retrieve-created-bundle",
    });

    return new WorkflowResponse(data[0]);
  }
);
