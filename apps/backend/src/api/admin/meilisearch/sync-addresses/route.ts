import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import {
  getManualAddressReindexStatus,
  startManualAddressReindex,
} from "../../../../lib/address-pipeline/manual-reindex-state";

export const GET = async (
  _req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> => {
  res.json(getManualAddressReindexStatus());
};

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> => {
  const result = startManualAddressReindex(req.scope);
  const statusCode = result.status.status === "disabled" ? 403 : 202;

  res.status(statusCode).json({
    ...result.status,
    message: result.message,
  });
};
