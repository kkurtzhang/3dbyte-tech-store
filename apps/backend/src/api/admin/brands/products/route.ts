import z from "zod";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { LinkDefinition } from "@medusajs/framework/types";
import { Modules } from "@medusajs/utils";
import { BRAND_MODULE } from "../../../../modules/brand";
import { dismissLinksWorkflow } from "@medusajs/medusa/core-flows";
import { DeleteAdminBatchLinkProductsBrand } from "../validators";
import { syncBrandsWorkflow } from "../../../../workflows/meilisearch/sync-brands";

type DeleteAdminBatchLinkProductsBrandType = z.infer<
  typeof DeleteAdminBatchLinkProductsBrand
>;

export const DELETE = async (
  req: MedusaRequest<DeleteAdminBatchLinkProductsBrandType>,
  res: MedusaResponse<LinkDefinition[]>
) => {
  const { ids } = req.validatedBody;
  const links: LinkDefinition[] = [];
  const brandIds = new Set<string>();

  for (const i of ids) {
    links.push({
      [Modules.PRODUCT]: {
        product_id: i.product_id,
      },
      [BRAND_MODULE]: {
        brand_id: i.brand_id,
      },
    });
    brandIds.add(i.brand_id);
  }
  const { result } = await dismissLinksWorkflow(req.scope).run({
    input: links,
  });

  // Trigger re-indexing for all affected brands to update product_count
  for (const brandId of brandIds) {
    await syncBrandsWorkflow(req.scope).run({
      input: {
        filters: {
          id: brandId,
        },
      },
    });
  }

  res.json(result);
};
