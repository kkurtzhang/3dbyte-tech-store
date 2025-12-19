import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import BrandModuleService from "../../modules/brand/service";
import { BRAND_MODULE } from "../../modules/brand";
import { emitEventStep } from "@medusajs/medusa/core-flows";

export type DeleteBrandStepInput = {
  id: string;
};

export const deleteBrandStep = createStep(
  "delete-brand-step",
  async (input: DeleteBrandStepInput, { container }) => {
    const brandModuleService: BrandModuleService =
      container.resolve(BRAND_MODULE);
    const prevBrand = await brandModuleService.retrieveBrand(input.id);
    await brandModuleService.deleteBrands(input.id);
    return new StepResponse(null, prevBrand);
  },
  async (revertInput, { container }) => {
    if (!revertInput) return;
    const brandModuleService: BrandModuleService =
      container.resolve(BRAND_MODULE);
    await brandModuleService.createBrands(revertInput);
  }
);

type DeleteBrandWorkflowInput = {
  id: string;
};

export const deleteBrandWorkflow = createWorkflow(
  "delete-brand",
  (input: DeleteBrandWorkflowInput) => {
    const brand = deleteBrandStep(input);
    emitEventStep({
      eventName: "brand.deleted",
      data: {
        id: input.id,
      },
    });

    return new WorkflowResponse(brand);
  }
);
