import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import { PRODUCT_FILES_MODULE } from "../../../../../modules/product-files";
import type ProductFilesModuleService from "../../../../../modules/product-files/service";

export const PostStoreProductRegistrationSchema = z.object({
  serial_number: z.string().min(1),
  medusa_product_id: z.string().min(1),
  order_id: z.string().optional(),
});

type PostStoreProductRegistration = z.infer<
  typeof PostStoreProductRegistrationSchema
>;

function getCustomerId(req: MedusaRequest): string | undefined {
  return (req as { auth_context?: { actor_id?: string } }).auth_context
    ?.actor_id;
}

export async function POST(
  req: MedusaRequest<PostStoreProductRegistration>,
  res: MedusaResponse,
): Promise<void> {
  const customerId = getCustomerId(req);

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const productFilesService =
    req.scope.resolve<ProductFilesModuleService>(PRODUCT_FILES_MODULE);
  const registration = await productFilesService.claimProductSerial({
    serialNumber: req.body.serial_number,
    medusaProductId: req.body.medusa_product_id,
    customerId,
    orderId: req.body.order_id,
  });

  res.json({ registration });
}
