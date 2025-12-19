import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import z from "zod";
import { updateBrandWorkflow } from "../../../../workflows/brand/update-brand";
import { PostAdminUpdateBrand } from "../validators";
import { deleteBrandWorkflow } from "../../../../workflows/brand/delete-brand";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params;

  const query = req.scope.resolve("query");

  const { data: brands } = await query.graph({
    entity: "brand",
    ...req.queryConfig,
    filters: { id },
  });

  res.json({
    brand: brands[0],
  });
};
type PostAdminUpdateBrandType = z.infer<typeof PostAdminUpdateBrand>;
export const PUT = async (
  req: MedusaRequest<PostAdminUpdateBrandType>,
  res: MedusaResponse
) => {
  const { id } = req.params;
  const { result } = await updateBrandWorkflow(req.scope).run({
    input: { id, ...req.validatedBody },
  });

  res.json({ brand: result });
};

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params;

  await deleteBrandWorkflow(req.scope).run({
    input: { id },
  });

  res.json({ success: true });
};
