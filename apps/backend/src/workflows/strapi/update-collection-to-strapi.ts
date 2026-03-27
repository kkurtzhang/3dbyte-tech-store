import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { useQueryGraphStep } from "@medusajs/medusa/core-flows";
import {
  StrapiModuleService,
  STRAPI_MODULE,
  type SyncCollectionData,
} from "../../modules/strapi";

type UpdateCollectionToStrapiStepInput = {
  collection: SyncCollectionData;
};

const updateCollectionToStrapiStep = createStep(
  "update-collection-to-strapi-step",
  async ({ collection }: UpdateCollectionToStrapiStepInput, { container }) => {
    const strapiModuleService: StrapiModuleService =
      container.resolve(STRAPI_MODULE);

    await strapiModuleService.updateCollectionDescription(collection);

    return new StepResponse(null, collection.id);
  },
  async (id, { container }) => {
    if (!id) {
      return;
    }

    const strapiModuleService: StrapiModuleService =
      container.resolve(STRAPI_MODULE);

    await strapiModuleService.markCollectionDescriptionOutdated(id);
  }
);

type UpdateCollectionToStrapiWorkflowInput = {
  id: string;
};

export const updateCollectionToStrapiWorkflow = createWorkflow(
  "update-collection-to-strapi",
  (input: UpdateCollectionToStrapiWorkflowInput) => {
    // @ts-ignore
    const { data: collections } = useQueryGraphStep({
      entity: "product_collection",
      fields: ["id", "title", "handle"],
      filters: {
        id: input.id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    });

    updateCollectionToStrapiStep({
      collection: collections[0],
    } as UpdateCollectionToStrapiStepInput);

    return new WorkflowResponse({});
  }
);
