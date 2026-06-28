import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  buildAiProductDraftEvent,
  getAiProductDraftNextStatus,
} from "../../../../../modules/ai-product-draft/lifecycle"
import {
  getAdminActorId,
  getAiProductDraftModule,
  getDraftById,
} from "../../utils"

function getRequestBody(req: MedusaRequest): { notes?: unknown } {
  return req.body && typeof req.body === "object"
    ? (req.body as { notes?: unknown })
    : {}
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const draft = await getDraftById(req, res)
  if (!draft) return

  if (draft.status !== "needs_review") {
    return res.status(409).json({ error: "Only needs_review drafts can be approved" })
  }

  const body = getRequestBody(req)
  const notes = typeof body.notes === "string" ? body.notes.trim() : ""
  const draftModule = getAiProductDraftModule(req)
  const actorId = getAdminActorId(req)
  const updated = await draftModule.updateAiProductDrafts({
    id: req.params.id,
    status: getAiProductDraftNextStatus("needs_review", "approved"),
    admin_notes: notes || null,
    approved_by: actorId || null,
    approved_at: new Date().toISOString(),
  })

  await draftModule.createAiProductDraftEvents(
    buildAiProductDraftEvent({
      draft_id: req.params.id,
      type: "approved",
      actor_type: "admin",
      actor_id: actorId || null,
      from_status: String(draft.status),
      to_status: "approved",
      metadata: {
        notes,
      },
    })
  )

  return res.status(200).json({ draft: updated })
}
