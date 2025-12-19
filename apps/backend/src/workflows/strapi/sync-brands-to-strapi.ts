import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { STRAPI_MODULE, StrapiModuleService } from "../../modules/strapi";
import { SyncBrandData } from "../../modules/strapi/service";
import { useQueryGraphStep } from "@medusajs/medusa/core-flows";

type SyncBrandToStrapiStepInput = {
  brand: SyncBrandData;
};

const syncBrandToStrapiStep = createStep(
  "sync-brand-to-strapi-step",
  async ({ brand }: SyncBrandToStrapiStepInput, { container }) => {
    const strapiModuleService: StrapiModuleService =
      container.resolve(STRAPI_MODULE);

    await strapiModuleService.createBrandDescription(brand);

    return new StepResponse(null, brand.id);
  },
  async (id, { container }) => {
    if (!id) {
      return;
    }

    const strapiModuleService: StrapiModuleService =
      container.resolve(STRAPI_MODULE);

    await strapiModuleService.deleteBrandDescription(id);
  }
);

type SyncBrandToStrapiWorkflowInput = {
  id: string;
};

export const syncBrandToStrapiWorkflow = createWorkflow(
  "sync-brand-to-strapi",
  (input: SyncBrandToStrapiWorkflowInput) => {
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

    syncBrandToStrapiStep({
      brand: brands[0],
    } as SyncBrandToStrapiStepInput);

    return new WorkflowResponse({});
  }
);
