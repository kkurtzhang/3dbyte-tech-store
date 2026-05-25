import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { PRODUCT_FILES_MODULE } from "../../../../../../../modules/product-files";
import type ProductFilesModuleService from "../../../../../../../modules/product-files/service";

function getCustomerId(req: MedusaRequest): string | undefined {
  return (req as { auth_context?: { actor_id?: string } }).auth_context
    ?.actor_id;
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const customerId = getCustomerId(req);

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const productFilesService =
    req.scope.resolve<ProductFilesModuleService>(PRODUCT_FILES_MODULE);
  const fileModuleService = req.scope.resolve<{
    retrieveFile: (fileKey: string) => Promise<{ url?: string }>;
  }>(Modules.FILE);
  const download = await productFilesService.createEntitledDownloadLink({
    fileId: req.params.fileId as string,
    customerId,
    retrieveFile: (fileKey) => fileModuleService.retrieveFile(fileKey),
  });

  res.json({ download });
}
