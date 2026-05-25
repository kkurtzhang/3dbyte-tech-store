import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import { PRODUCT_FILES_MODULE } from "../../../modules/product-files";
import {
  ProductRegistrationSource,
  ProductRegistrationStatus,
} from "../../../modules/product-files/models/product-registration";
import { normalizeSerialNumber } from "../../../modules/product-files/service";
import type ProductFilesModuleService from "../../../modules/product-files/service";

export const PostAdminProductRegistrationSchema = z.object({
  serial_number: z.string().min(1),
  medusa_product_id: z.string().min(1),
  customer_id: z.string().optional(),
  order_id: z.string().optional(),
});

type PostAdminProductRegistration = z.infer<
  typeof PostAdminProductRegistrationSchema
>;

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const productFilesService =
    req.scope.resolve<ProductFilesModuleService>(PRODUCT_FILES_MODULE);
  const registrations = await productFilesService.listProductRegistrations({});

  res.json({ registrations });
}

export async function POST(
  req: MedusaRequest<PostAdminProductRegistration>,
  res: MedusaResponse,
): Promise<void> {
  const productFilesService =
    req.scope.resolve<ProductFilesModuleService>(PRODUCT_FILES_MODULE);
  const claimed = Boolean(req.body.customer_id);
  const registration = await productFilesService.createProductRegistrations({
    serial_number: normalizeSerialNumber(req.body.serial_number),
    medusa_product_id: req.body.medusa_product_id,
    customer_id: req.body.customer_id ?? null,
    order_id: req.body.order_id ?? null,
    status: claimed
      ? ProductRegistrationStatus.CLAIMED
      : ProductRegistrationStatus.AVAILABLE,
    source: claimed
      ? ProductRegistrationSource.STAFF_ASSIGNED
      : ProductRegistrationSource.SERIAL_IMPORT,
    claimed_at: claimed ? new Date() : null,
  });

  res.status(201).json({ registration });
}
