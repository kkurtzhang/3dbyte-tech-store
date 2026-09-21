import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { prepareReplacement } from "../../../../../lib/ai-product-drafts/reprocess"
import { withDraftQuality } from "../../../../../lib/ai-product-drafts/quality"
import { resolveAiProductDraftOperation } from "../../../../../lib/ai-product-drafts/resolution"
import { buildAiProductDraftEvent } from "../../../../../modules/ai-product-draft/lifecycle"
import { buildResolvedDraftState, getAdminActorId, getAiProductDraftModule, getDraftById, resolveProductCandidates } from "../../utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const previous = await getDraftById(req, res)
  if (!previous) return
  let replacement: ReturnType<typeof prepareReplacement>
  try { replacement = prepareReplacement(previous, req.body) }
  catch (error) { return res.status(409).json({ error: error instanceof Error ? error.message : "Invalid replacement research" }) }
  const { packet, draft: normalized } = replacement
  const candidates = await resolveProductCandidates(req, packet)
  const resolution = resolveAiProductDraftOperation({ requested_operation: packet.requested_operation,
    product_id: packet.product_id, product_handle: packet.product_handle, candidates })
  if (resolution.resolution_status === "validation_failed") return res.status(409).json({ error: "Replacement research does not resolve to the requested product." })
  const operation = resolution.operation
  const target = resolution.target
  const state = operation ? buildResolvedDraftState({ operation, target: target || null, normalized_draft: normalized }) : null
  const module = getAiProductDraftModule(req)
  // Save the full prior draft before mutation. Failure here leaves the original untouched.
  await module.createAiProductDraftEvents(buildAiProductDraftEvent({ draft_id: req.params.id, type: "research_replacement_backup",
    actor_type: "admin", actor_id: getAdminActorId(req), from_status: String(previous.status),
    metadata: { previous_draft: previous, replacement_request_id: packet.request_id } }))
  const updated = await module.updateAiProductDrafts({ id: req.params.id,
    status: operation ? "needs_review" : "needs_resolution", packet_version: 3,
    source_agent: packet.source_agent, request_id: packet.request_id, requested_operation: packet.requested_operation,
    resolved_operation: operation, resolution_status: resolution.resolution_status, identity_candidates: candidates,
    raw_packet: packet, product_input: packet.product_input, source_summary: packet.source_summary,
    normalized_draft: state?.normalizedDraft || normalized, product_id: state?.productId || null, product_handle: state?.productHandle || null,
    current_snapshot: state?.currentSnapshot || null, snapshot_hash: state?.snapshotHash || null, proposed_changes: state?.proposedChanges || [],
    sources: packet.sources, warnings: normalized.warnings, confidence_summary: normalized.confidence_summary,
    validation_errors: [], normalizer: "deterministic:v3", normalizer_trace_id: null,
    approved_changes: null, approved_import_targets: null, approved_snapshot_hash: null, approved_at: null, approved_by: null,
    rejected_at: null, rejected_by: null, rejection_reason: null,
  })
  await module.createAiProductDraftEvents(buildAiProductDraftEvent({ draft_id: req.params.id, type: "research_replaced",
    actor_type: "admin", actor_id: getAdminActorId(req), from_status: String(previous.status), to_status: String(updated.status), metadata: { packet_version: 3 } }))
  return res.json({ draft: withDraftQuality(updated) })
}
