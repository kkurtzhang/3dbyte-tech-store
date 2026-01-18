import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import BrandModuleService from "../../modules/brand/service";
import { BRAND_MODULE } from "../../modules/brand";
import { LinkDefinition } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export type LinkProductsToBrandStepInput = {
  brand_id: string;
  products: string[]; //array of product_id
};

export const linkProductsToBrandStep = createStep(
  "link-products-to-brand-step",
  async (
    { brand_id, products }: LinkProductsToBrandStepInput,
    { container }
  ) => {
    const brandModuleService: BrandModuleService =
      container.resolve(BRAND_MODULE);

    // if the brand doesn't exist, an error is thrown.
    await brandModuleService.retrieveBrand(brand_id);

    const link = container.resolve("link");
    const logger = container.resolve("logger");

    const links: LinkDefinition[] = [];

    for (const product_id of products) {
      links.push({
        [Modules.PRODUCT]: {
          product_id: product_id,
        },
        [BRAND_MODULE]: {
          brand_id: brand_id,
        },
      });
    }

    await link.create(links);

    logger.info("Linked brand to products");

    return new StepResponse(links, links);
  },
  async (links, { container }) => {
    if (!links?.length) {
      return;
    }

    const link = container.resolve("link");

    await link.dismiss(links);
  }
);

type LinkProductsToBrandWorkflowInput = {
  brand_id: string;
  products: string[]; //array of product_id
};

export const LinkProductsToBrandWorkflow = createWorkflow(
  "link-products-to-brand",
  (input: LinkProductsToBrandWorkflowInput) => {
    const links = linkProductsToBrandStep(input);

    return new WorkflowResponse({ links, brand_id: input.brand_id });
  }
);
