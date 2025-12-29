import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { IProductModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import {
  STRAPI_MODULE,
  StrapiModuleService,
} from "../../../../../modules/strapi";

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const productModuleService: IProductModuleService = req.scope.resolve(
    Modules.PRODUCT
  );
  const strapiService: StrapiModuleService = req.scope.resolve(STRAPI_MODULE);
  const { id } = req.params;

  const product = await productModuleService.retrieveProduct(id as string);

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Product not found. Failed to sync product with Strapi"
    );
  }

  // Only sync the required fields
  const syncData = {
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
  };

  const result = await strapiService.updateProductDescription(syncData);

  res.json({
    message: "Product synced with Strapi successfully",
    strapi_data: result,
  });
};
