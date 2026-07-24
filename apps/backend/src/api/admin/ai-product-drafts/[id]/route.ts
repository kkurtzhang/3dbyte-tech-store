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

const CLEANUP_STATUSES = new Set(["validation_failed", "rejected"])

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const draft = await getDraftById(req, res)
  if (!draft) return

  if (!CLEANUP_STATUSES.has(String(draft.status))) {
    return res.status(409).json({
      error:
        "Only validation-failed or rejected AI product drafts can be deleted",
    })
  }

  const draftModule = getAiProductDraftModule(req)
  await draftModule.softDeleteAiProductDrafts(req.params.id)

  return res.status(200).json({
    id: req.params.id,
    deleted: true,
  })
}
