import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import { PRODUCT_FILES_MODULE } from "../../../modules/product-files";
import { ProductEntitlementFileType } from "../../../modules/product-files/models/product-entitlement-file";
import type ProductFilesModuleService from "../../../modules/product-files/service";

export const PostAdminProductEntitlementFileSchema = z.object({
  medusa_product_id: z.string().min(1),
  title: z.string().min(1),
  document_type: z
    .enum([
      ProductEntitlementFileType.FIRMWARE,
      ProductEntitlementFileType.CALIBRATION_FILE,
      ProductEntitlementFileType.SERVICE_MANUAL,
      ProductEntitlementFileType.SOFTWARE,
      ProductEntitlementFileType.OTHER,
    ])
    .default(ProductEntitlementFileType.OTHER),
  file_key: z.string().min(1),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
  file_size: z.number().optional(),
  version: z.string().optional(),
  release_notes: z.string().optional(),
});

type PostAdminProductEntitlementFile = z.infer<
  typeof PostAdminProductEntitlementFileSchema
>;

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const productFilesService =
    req.scope.resolve<ProductFilesModuleService>(PRODUCT_FILES_MODULE);
  const productFiles = await productFilesService.listProductEntitlementFiles({});

  res.json({ product_files: productFiles });
}

export async function POST(
  req: MedusaRequest<PostAdminProductEntitlementFile>,
  res: MedusaResponse,
): Promise<void> {
  const productFilesService =
    req.scope.resolve<ProductFilesModuleService>(PRODUCT_FILES_MODULE);
  const productFile = await productFilesService.createProductEntitlementFiles({
    medusa_product_id: req.body.medusa_product_id,
    title: req.body.title,
    document_type: req.body.document_type,
    file_key: req.body.file_key,
    file_name: req.body.file_name ?? null,
    mime_type: req.body.mime_type ?? null,
    file_size: req.body.file_size ?? null,
    version: req.body.version ?? null,
    release_notes: req.body.release_notes ?? null,
    is_active: true,
  });

  res.status(201).json({ product_file: productFile });
}
