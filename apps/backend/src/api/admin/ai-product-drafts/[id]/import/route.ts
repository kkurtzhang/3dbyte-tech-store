import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  importAiProductDraft,
  type AiProductDraftImportProgress,
} from "../../../../../lib/ai-product-drafts/importer"
import { sendAiProductDraftAdminNotification } from "../../../../../lib/ai-product-drafts/notifications"
import {
  assertAiProductDraftCanImport,
  buildAiProductDraftEvent,
} from "../../../../../modules/ai-product-draft/lifecycle"
import {
  getAdminActorId,
  getAiProductDraftModule,
  getDraftById,
} from "../../utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const draft = await getDraftById(req, res)
  if (!draft) return

  try {
    assertAiProductDraftCanImport({
      id: String(draft.id),
      status: String(draft.status),
      resolved_operation:
        draft.resolved_operation === "create" ||
        draft.resolved_operation === "enrich"
          ? draft.resolved_operation
          : null,
    })
  } catch (error) {
    return res.status(409).json({
      error: error instanceof Error ? error.message : "Draft cannot be imported",
    })
  }

  const draftModule = getAiProductDraftModule(req)
  const actorId = getAdminActorId(req)
  let importProgress =
    draft.import_progress &&
    typeof draft.import_progress === "object" &&
    !Array.isArray(draft.import_progress)
      ? (draft.import_progress as AiProductDraftImportProgress)
      : {}
  let importedProductId = String(draft.product_id || "")
  let importedProductHandle = String(draft.product_handle || "")
  let importSummary

  try {
    importSummary = await importAiProductDraft({
      container: req.scope as never,
      draft: draft as never,
      onProgress: async (progress) => {
        importProgress = progress
        importedProductId =
          progress.medusa_product?.product_id || importedProductId
        importedProductHandle =
          progress.medusa_product?.product_handle || importedProductHandle

        await draftModule.updateAiProductDrafts({
          id: req.params.id,
          import_progress: progress,
          ...(importedProductId ? { product_id: importedProductId } : {}),
          ...(importedProductHandle
            ? { product_handle: importedProductHandle }
            : {}),
        })
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI product draft import failed"

    await draftModule.createAiProductDraftEvents(
      buildAiProductDraftEvent({
        draft_id: req.params.id,
        type: "import_failed",
        actor_type: "admin",
        actor_id: actorId || null,
        from_status: String(draft.status),
        to_status: String(draft.status),
        metadata: { error: message },
      })
    )
    await sendAiProductDraftAdminNotification(req.scope as never, {
      kind: "import_failed",
      draft_id: req.params.id,
      product_id: importedProductId,
      product_handle: importedProductHandle,
      error: message,
    })

    return res.status(502).json({ error: message })
  }

  const updated = await draftModule.updateAiProductDrafts({
    id: req.params.id,
    status: "imported",
    imported_by: actorId || null,
    imported_at: new Date().toISOString(),
    product_id: importSummary.product_id,
    product_handle: importSummary.product_handle,
    import_progress: importProgress,
    import_summary: importSummary,
  })

  await draftModule.createAiProductDraftEvents(
    buildAiProductDraftEvent({
      draft_id: req.params.id,
      type: "imported",
      actor_type: "admin",
      actor_id: actorId || null,
      from_status: String(draft.status),
      to_status: "imported",
      metadata: importSummary,
    })
  )
  await sendAiProductDraftAdminNotification(req.scope as never, {
    kind: "imported",
    draft_id: req.params.id,
    product_id: importSummary.product_id,
    product_handle: importSummary.product_handle,
  })

  return res.status(200).json({ draft: updated })
}
