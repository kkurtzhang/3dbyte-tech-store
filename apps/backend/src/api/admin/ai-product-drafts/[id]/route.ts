import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getAiProductDraftModule, getDraftById } from "../utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const draft = await getDraftById(req, res)
  if (!draft) return

  const draftModule = getAiProductDraftModule(req)
  const events = await draftModule.listAiProductDraftEvents({
    draft_id: req.params.id,
  })

  return res.json({ draft, events })
}
