import z from "zod";
import { PostAdminLinkProductsToBrand } from "../../validators";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import { BRAND_MODULE } from "../../../../../modules/brand";
import { LinkDefinition } from "@medusajs/framework/types";
import {
  createLinksWorkflow,
  dismissLinksWorkflow,
  updateLinksWorkflow,
} from "@medusajs/medusa/core-flows";

type PostAdminLinkProductsToBrandType = z.infer<
  typeof PostAdminLinkProductsToBrand
>;
export const POST = async (
  req: MedusaRequest<PostAdminLinkProductsToBrandType>,
  res: MedusaResponse
) => {
  const { id } = req.params;
  const { products } = req.validatedBody;
  const links: LinkDefinition[] = [];
  for (const product_id of products) {
    links.push({
      [Modules.PRODUCT]: {
        product_id: product_id,
      },
      [BRAND_MODULE]: {
        brand_id: id,
      },
    });
  }
  const { result } = await createLinksWorkflow(req.scope).run({
    input: links,
  });

  res.json(result);
};

export const DELETE = async (
  req: MedusaRequest<PostAdminLinkProductsToBrandType>,
  res: MedusaResponse<LinkDefinition[]>
) => {
  const { id } = req.params;
  const { products } = req.validatedBody;
  const links: LinkDefinition[] = [];
  for (const product_id of products) {
    links.push({
      [Modules.PRODUCT]: {
        product_id: product_id,
      },
      [BRAND_MODULE]: {
        brand_id: id,
      },
    });
  }
  const { result } = await dismissLinksWorkflow(req.scope).run({
    input: links,
  });

  res.json(result);
};
