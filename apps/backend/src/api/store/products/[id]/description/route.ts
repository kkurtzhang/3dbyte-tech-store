import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import {
  STRAPI_MODULE,
  StrapiModuleService,
} from "../../../../../modules/strapi";

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const strapiService: StrapiModuleService = req.scope.resolve(STRAPI_MODULE);
  const { id } = req.params;

  const description = await strapiService.getProductDescription(id as string);

  if (!description) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Product description not found. Failed to fetch product description"
    );
  }

  res.json({ description });
};
