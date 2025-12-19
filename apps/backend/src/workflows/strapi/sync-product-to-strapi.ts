import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { StrapiModuleService, STRAPI_MODULE } from "../../modules/strapi";
import { SyncProductData } from "../../modules/strapi/service";
import { useQueryGraphStep } from "@medusajs/medusa/core-flows";

type SyncProductToStrapiStepInput = {
  product: SyncProductData;
};

const syncProductToStrapiStep = createStep(
  "sync-product-to-strapi-step",
  async ({ product }: SyncProductToStrapiStepInput, { container }) => {
    const strapiModuleService: StrapiModuleService =
      container.resolve(STRAPI_MODULE);

    await strapiModuleService.createProductDescription(product);

    return new StepResponse(null, product.id);
  },
  async (id, { container }) => {
    if (!id) {
      return;
    }

    const strapiModuleService: StrapiModuleService =
      container.resolve(STRAPI_MODULE);
    await strapiModuleService.deleteProductDescription(id);
  }
);

type SyncProductToStrapiWorkflowInput = {
  id: string;
};

export const syncProductToStrapiWorkflow = createWorkflow(
  "sync-product-to-strapi",
  (input: SyncProductToStrapiWorkflowInput) => {
    // @ts-ignore
    const { data: products } = useQueryGraphStep({
      entity: "product",
      fields: ["id", "title", "handle"],
      filters: {
        id: input.id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    });

    syncProductToStrapiStep({
      product: products[0],
    } as SyncProductToStrapiStepInput);

    return new WorkflowResponse({});
  }
);
