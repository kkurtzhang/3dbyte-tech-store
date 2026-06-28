import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  authorizeHermesProductDraftRequest,
  isHermesProductDraftPayloadTooLarge,
} from "../../../../lib/ai-product-drafts/security"
import { createDraftFromHermesPacket } from "../../../admin/ai-product-drafts/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!authorizeHermesProductDraftRequest(req, res)) {
    return
  }

  if (isHermesProductDraftPayloadTooLarge(req.body)) {
    return res.status(413).json({ error: "Product research packet is too large" })
  }

  return createDraftFromHermesPacket(req, res)
}
