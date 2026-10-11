import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { withAiDraftLock } from "../../../../../lib/ai-product-drafts/locking";
import { draftReviewHash } from "../../../../../lib/ai-product-drafts/quality";
import { buildAiProductDraftEvent } from "../../../../../modules/ai-product-draft/lifecycle";
import {
  getAdminActorId,
  getAiProductDraftModule,
  getDraftById,
} from "../../utils";

const REVIEWABLE_STATUSES = new Set([
  "needs_review",
  "needs_resolution",
  "validation_failed",
]);

function getRequestBody(req: MedusaRequest): {
  reason?: unknown;
  review_hash?: unknown;
} {
  return req.body && typeof req.body === "object"
    ? (req.body as { reason?: unknown; review_hash?: unknown })
    : {};
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return withAiDraftLock(req, () => mutateDraft(req, res));
}

async function mutateDraft(req: MedusaRequest, res: MedusaResponse) {
  const body = getRequestBody(req);
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return res.status(400).json({ error: "A rejection reason is required", message: "A rejection reason is required" });
  }
  const draft = await getDraftById(req, res);
  if (!draft) return;
  if (
    !REVIEWABLE_STATUSES.has(String(draft.status)) ||
    draft.approved_at ||
    draft.imported_at ||
    (draft.import_progress && Object.keys(draft.import_progress).length > 0)
  ) {
    return res.status(409).json({
      error:
        "Only unapproved reviewable drafts without imported work can be rejected.",
      message:
        "Only unapproved reviewable drafts without imported work can be rejected.",
    });
  }
  if (
    typeof body.review_hash !== "string" ||
    body.review_hash !== draftReviewHash(draft)
  ) {
    return res.status(409).json({
      error:
        "Draft research changed or was not reviewed. Refresh the draft before rejecting it.",
      message:
        "Draft research changed or was not reviewed. Refresh the draft before rejecting it.",
    });
  }
  const draftModule = getAiProductDraftModule(req);
  const actorId = getAdminActorId(req);
  const fromStatus = String(draft.status);
  const updated = await draftModule.withDraftTransaction(async (context) => {
    const updated = await draftModule.updateAiProductDrafts(
      {
        id: req.params.id,
        status: "rejected",
        rejection_reason: reason,
        rejected_by: actorId || null,
        rejected_at: new Date().toISOString(),
      },
      context,
    );
    await draftModule.createAiProductDraftEvents(
      buildAiProductDraftEvent({
        draft_id: req.params.id,
        type: "rejected",
        actor_type: "admin",
        actor_id: actorId || null,
        from_status: fromStatus,
        to_status: "rejected",
        metadata: { reason, review_hash: body.review_hash },
      }),
      context,
    );
    return updated;
  });
  return res.status(200).json({ draft: updated });
}
