import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { BUNDLED_PRODUCT_MODULE } from "../../../modules/bundled-product";
import BundledProductModuleService from "../../../modules/bundled-product/service";

type CreateBundleStepInput = {
  title: string;
};

export const createBundleStep = createStep(
  "create-bundle",
  async ({ title }: CreateBundleStepInput, { container }) => {
    const bundledProductModuleService: BundledProductModuleService =
      container.resolve(BUNDLED_PRODUCT_MODULE);

    const bundle = await bundledProductModuleService.createBundles({
      title,
    });

    return new StepResponse(bundle, bundle.id);
  },
  async (bundleId, { container }) => {
    if (!bundleId) {
      return;
    }

    const bundledProductModuleService: BundledProductModuleService =
      container.resolve(BUNDLED_PRODUCT_MODULE);

    await bundledProductModuleService.deleteBundles(bundleId);
  }
);
