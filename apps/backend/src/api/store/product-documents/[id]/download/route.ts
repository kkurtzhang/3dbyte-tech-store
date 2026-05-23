import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import {
  STRAPI_MODULE,
  StrapiModuleService,
} from "../../../../../modules/strapi";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const strapiService: StrapiModuleService = req.scope.resolve(STRAPI_MODULE);
  const document = await strapiService.getProductDocument(req.params.id as string);

  if (!document?.file_url) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Product document was not found",
    );
  }

  res.redirect(302, document.file_url);
}
