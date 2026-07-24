import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type {
  AiProductDraftCandidate,
  AiProductDraftOperation,
} from "../../../../../lib/ai-product-drafts/resolution"
import { buildAiProductDraftEvent } from "../../../../../modules/ai-product-draft/lifecycle"
import {
  buildResolvedDraftState,
  getAdminActorId,
  getAiProductDraftModule,
  getDraftById,
  getRecord,
} from "../../utils"

function getCandidates(value: unknown): AiProductDraftCandidate[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((candidate) => {
    const record = getRecord(candidate)
    const id = typeof record.id === "string" ? record.id.trim() : ""

    return id
      ? [
          {
            id,
            handle:
              typeof record.handle === "string" ? record.handle.trim() : null,
            title: typeof record.title === "string" ? record.title.trim() : null,
            metadata: getRecord(record.metadata),
          },
        ]
      : []
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const draft = await getDraftById(req, res)
  if (!draft) return

  if (draft.status !== "needs_resolution") {
    return res
      .status(409)
      .json({ error: "Only needs_resolution drafts can be resolved" })
  }

  const body = getRecord(req.body)
  const operation = body.operation

  if (operation !== "create" && operation !== "enrich") {
    return res.status(400).json({ error: "operation must be create or enrich" })
  }

  const candidates = getCandidates(draft.identity_candidates)
  const productId =
    typeof body.product_id === "string" ? body.product_id.trim() : ""
  const target =
    operation === "enrich"
      ? candidates.find((candidate) => candidate.id === productId) || null
      : null

  if (operation === "enrich" && !target) {
    return res.status(400).json({
      error: "product_id must identify one of the stored product candidates",
    })
  }

  const normalizedDraft = getRecord(draft.normalized_draft)
  const resolvedState = buildResolvedDraftState({
    operation: operation as AiProductDraftOperation,
    target,
    normalized_draft: normalizedDraft,
  })
  const draftModule = getAiProductDraftModule(req)
  const actorId = getAdminActorId(req)
  const updated = await draftModule.updateAiProductDrafts({
    id: req.params.id,
    status: "needs_review",
    resolved_operation: operation,
    resolution_status: "resolved",
    product_id: resolvedState.productId,
    product_handle: resolvedState.productHandle,
    normalized_draft: resolvedState.normalizedDraft,
    current_snapshot: resolvedState.currentSnapshot,
    snapshot_hash: resolvedState.snapshotHash,
    proposed_changes: resolvedState.proposedChanges,
  })

  await draftModule.createAiProductDraftEvents(
    buildAiProductDraftEvent({
      draft_id: req.params.id,
      type: "resolved",
      actor_type: "admin",
      actor_id: actorId || null,
      from_status: "needs_resolution",
      to_status: "needs_review",
      metadata: {
        operation,
        product_id: resolvedState.productId,
      },
    })
  )

  return res.status(200).json({ draft: updated })
}
