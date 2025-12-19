import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { StrapiModuleService, STRAPI_MODULE } from "../../modules/strapi";
import { SyncProductData } from "../../modules/strapi/service";
import { useQueryGraphStep } from "@medusajs/medusa/core-flows";

type UpdateProductToStrapiStepInput = {
  product: SyncProductData;
};

const updateProductToStrapiStep = createStep(
  "update-product-to-strapi-step",
  async ({ product }: UpdateProductToStrapiStepInput, { container }) => {
    const strapiModuleService: StrapiModuleService =
      container.resolve(STRAPI_MODULE);

    await strapiModuleService.updateProductDescription(product);

    return new StepResponse(null, product.id);
  },
  async (id, { container }) => {
    if (!id) {
      return;
    }

    const strapiModuleService: StrapiModuleService =
      container.resolve(STRAPI_MODULE);
    await strapiModuleService.markProductDescriptionOutdated(id);
  }
);

type UpdateProductToStrapiWorkflowInput = {
  id: string;
};

export const updateProductToStrapiWorkflow = createWorkflow(
  "update-product-to-strapi",
  (input: UpdateProductToStrapiWorkflowInput) => {
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

    updateProductToStrapiStep({
      product: products[0],
    } as UpdateProductToStrapiStepInput);

    return new WorkflowResponse({});
  }
);
