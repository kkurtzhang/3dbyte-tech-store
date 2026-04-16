import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import {
  createBundledProductWorkflow,
  type CreateBundledProductWorkflowInput,
} from "../../../workflows/bundled-product/create-bundled-product";
import { PostAdminCreateBundledProduct } from "./validators";

type PostAdminCreateBundledProductType = z.infer<
  typeof PostAdminCreateBundledProduct
>;

export async function POST(
  req: AuthenticatedMedusaRequest<PostAdminCreateBundledProductType>,
  res: MedusaResponse
) {
  const { result: bundledProduct } = await createBundledProductWorkflow(req.scope).run({
    input: {
      bundle: req.validatedBody as CreateBundledProductWorkflowInput["bundle"],
    },
  });

  res.json({
    bundled_product: bundledProduct,
  });
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query");
  const { data: bundledProducts, metadata: { count, take, skip } = {} } =
    await query.graph({
      entity: "bundle",
      ...req.queryConfig,
    });

  res.json({
    bundled_products: bundledProducts,
    count: count || 0,
    limit: take || 15,
    offset: skip || 0,
  });
}
