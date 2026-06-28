import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  authorizeHermesProductDraftRequest,
  isHermesProductDraftPayloadTooLarge,
} from "../../../lib/ai-product-drafts/security"
import {
  createDraftFromHermesPacket,
  filterDrafts,
  getAiProductDraftModule,
  parseLimit,
  parseOffset,
} from "./utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const draftModule = getAiProductDraftModule(req)
  const drafts = await draftModule.listAiProductDrafts({})
  const filtered = filterDrafts(drafts, {
    q: typeof req.query.q === "string" ? req.query.q : undefined,
    source_agent:
      typeof req.query.source_agent === "string"
        ? req.query.source_agent
        : undefined,
    status: typeof req.query.status === "string" ? req.query.status : undefined,
  })
  const limit = parseLimit(req.query.limit)
  const offset = parseOffset(req.query.offset)

  return res.json({
    drafts: filtered.slice(offset, offset + limit),
    count: filtered.length,
    limit,
    offset,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!authorizeHermesProductDraftRequest(req, res)) {
    return
  }

  if (isHermesProductDraftPayloadTooLarge(req.body)) {
    return res.status(413).json({ error: "Product research packet is too large" })
  }

  return createDraftFromHermesPacket(req, res)
}
