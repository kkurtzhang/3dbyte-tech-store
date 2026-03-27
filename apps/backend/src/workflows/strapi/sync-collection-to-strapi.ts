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

type SyncCollectionToStrapiStepInput = {
  collection: SyncCollectionData;
};

const syncCollectionToStrapiStep = createStep(
  "sync-collection-to-strapi-step",
  async ({ collection }: SyncCollectionToStrapiStepInput, { container }) => {
    const strapiModuleService: StrapiModuleService =
      container.resolve(STRAPI_MODULE);

    await strapiModuleService.createCollectionDescription(collection);

    return new StepResponse(null, collection.id);
  },
  async (id, { container }) => {
    if (!id) {
      return;
    }

    const strapiModuleService: StrapiModuleService =
      container.resolve(STRAPI_MODULE);
    await strapiModuleService.deleteCollectionDescription(id);
  }
);

type SyncCollectionToStrapiWorkflowInput = {
  id: string;
};

export const syncCollectionToStrapiWorkflow = createWorkflow(
  "sync-collection-to-strapi",
  (input: SyncCollectionToStrapiWorkflowInput) => {
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

    syncCollectionToStrapiStep({
      collection: collections[0],
    } as SyncCollectionToStrapiStepInput);

    return new WorkflowResponse({});
  }
);
