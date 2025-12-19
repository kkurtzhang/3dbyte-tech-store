import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { StrapiModuleService, STRAPI_MODULE } from "../../modules/strapi";
import { SyncBrandData } from "../../modules/strapi/service";
import { useQueryGraphStep } from "@medusajs/medusa/core-flows";

type UpdateBrandToStrapiStepInput = {
  brand: SyncBrandData;
};

const updateProductToStrapiStep = createStep(
  "update-brand-to-strapi-step",
  async ({ brand }: UpdateBrandToStrapiStepInput, { container }) => {
    const strapiModuleService: StrapiModuleService =
      container.resolve(STRAPI_MODULE);

    await strapiModuleService.updateBrandDescription(brand);

    return new StepResponse(null, brand.id);
  },
  async (id, { container }) => {
    if (!id) {
      return;
    }

    const strapiModuleService: StrapiModuleService =
      container.resolve(STRAPI_MODULE);
    await strapiModuleService.markBrandDescriptionOutdated(id);
  }
);

type UpdateBrandToStrapiWorkflowInput = {
  id: string;
};

export const updateBrandToStrapiWorkflow = createWorkflow(
  { name: "update-brand-to-strapi" },
  (input: UpdateBrandToStrapiWorkflowInput) => {
    // @ts-ignore
    const { data: brands } = useQueryGraphStep({
      entity: "brand",
      fields: ["id", "name", "handle"],
      filters: {
        id: input.id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    });

    updateProductToStrapiStep({
      brand: brands[0],
    } as UpdateBrandToStrapiStepInput);

    return new WorkflowResponse({});
  }
);
