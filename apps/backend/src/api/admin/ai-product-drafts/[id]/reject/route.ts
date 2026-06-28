import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { buildAiProductDraftEvent } from "../../../../../modules/ai-product-draft/lifecycle"
import {
  getAdminActorId,
  getAiProductDraftModule,
  getDraftById,
} from "../../utils"

function getRequestBody(req: MedusaRequest): { reason?: unknown } {
  return req.body && typeof req.body === "object"
    ? (req.body as { reason?: unknown })
    : {}
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = getRequestBody(req)
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""

  if (!reason) {
    return res.status(400).json({ error: "A rejection reason is required" })
  }

  const draft = await getDraftById(req, res)
  if (!draft) return

  if (draft.status === "imported") {
    return res.status(409).json({ error: "Imported drafts cannot be rejected" })
  }

  const draftModule = getAiProductDraftModule(req)
  const actorId = getAdminActorId(req)
  const updated = await draftModule.updateAiProductDrafts({
    id: req.params.id,
    status: "rejected",
    rejection_reason: reason,
    rejected_by: actorId || null,
    rejected_at: new Date().toISOString(),
  })

  await draftModule.createAiProductDraftEvents(
    buildAiProductDraftEvent({
      draft_id: req.params.id,
      type: "rejected",
      actor_type: "admin",
      actor_id: actorId || null,
      from_status: String(draft.status),
      to_status: "rejected",
      metadata: { reason },
    })
  )

  return res.status(200).json({ draft: updated })
}
