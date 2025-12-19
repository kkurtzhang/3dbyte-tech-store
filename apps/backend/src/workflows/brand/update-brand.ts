import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { BRAND_MODULE } from "../../modules/brand";
import BrandModuleService from "../../modules/brand/service";
import { emitEventStep } from "@medusajs/medusa/core-flows";

export type UpdateBrandStepInput = {
  id: string;
  name?: string;
  handle?: string;
};

export const updateBrandStep = createStep(
  "update-brand-step",
  async (input: UpdateBrandStepInput, { container }) => {
    const brandModuleService: BrandModuleService =
      container.resolve(BRAND_MODULE);

    const dataBeforeUpdate = await brandModuleService.listBrands({
      id: input.id,
    });
    const updatedBrands = await brandModuleService.updateBrands(input);

    return new StepResponse(updatedBrands[0], { dataBeforeUpdate });
  },
  async (revertInput, { container }) => {
    if (!revertInput) return;
    const brandModuleService: BrandModuleService =
      container.resolve(BRAND_MODULE);
    await brandModuleService.updateBrands(revertInput.dataBeforeUpdate);
  }
);

type UpdateBrandWorkflowInput = {
  id: string;
  name?: string;
  handle?: string;
};

export const updateBrandWorkflow = createWorkflow(
  "update-brand",
  (input: UpdateBrandWorkflowInput) => {
    const brand = updateBrandStep(input);
    emitEventStep({
      eventName: "brand.updated",
      data: {
        id: brand.id,
      },
    });

    return new WorkflowResponse(brand);
  }
);
