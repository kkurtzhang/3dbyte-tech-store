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

type ApprovalRequestBody = {
  notes?: unknown
  selected_change_paths?: unknown
  import_targets?: unknown
  snapshot_hash?: unknown
}

type ProposedChange = {
  path: string
  default_selected?: boolean
  [key: string]: unknown
}

function getRequestBody(req: MedusaRequest): ApprovalRequestBody {
  return req.body && typeof req.body === "object"
    ? (req.body as ApprovalRequestBody)
    : {}
}

function getProposedChanges(value: unknown): ProposedChange[] {
  if (!Array.isArray(value)) return []

  return value.filter((change): change is ProposedChange => {
    return (
      change !== null &&
      typeof change === "object" &&
      typeof (change as { path?: unknown }).path === "string"
    )
  })
}

function getImportTargets(value: unknown) {
  const defaults = {
    medusa_metadata: true,
    strapi_description_draft: true,
    product_document_drafts: true,
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaults
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(defaults) as (keyof typeof defaults)[]

  if (keys.some((key) => typeof record[key] !== "boolean")) {
    return null
  }

  return Object.fromEntries(keys.map((key) => [key, record[key]]))
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const draft = await getDraftById(req, res)
  if (!draft) return

  if (draft.status !== "needs_review") {
    return res.status(409).json({ error: "Only needs_review drafts can be approved" })
  }

  if (
    draft.resolved_operation !== "create" &&
    draft.resolved_operation !== "enrich"
  ) {
    return res.status(409).json({
      error:
        "This draft has no resolved operation. Repair or resolve it before approval.",
    })
  }

  const body = getRequestBody(req)
  const notes = typeof body.notes === "string" ? body.notes.trim() : ""
  const proposedChanges = getProposedChanges(draft.proposed_changes)
  const selectedChangePaths =
    body.selected_change_paths === undefined
      ? proposedChanges
          .filter((change) => change.default_selected === true)
          .map((change) => change.path)
      : Array.isArray(body.selected_change_paths) &&
          body.selected_change_paths.length <= 80 &&
          body.selected_change_paths.every(
            (path) => typeof path === "string" && path.trim().length > 0
          )
        ? [...new Set(body.selected_change_paths.map((path) => String(path).trim()))]
        : null

  if (!selectedChangePaths) {
    return res.status(400).json({
      error: "selected_change_paths must be an array of at most 80 paths",
    })
  }

  const knownPaths = new Set(proposedChanges.map((change) => change.path))
  if (selectedChangePaths.some((path) => !knownPaths.has(path))) {
    return res
      .status(400)
      .json({ error: "selected_change_paths contains an unknown change path" })
  }

  const importTargets = getImportTargets(body.import_targets)
  if (!importTargets) {
    return res.status(400).json({
      error:
        "import_targets must provide boolean values for every supported target",
    })
  }

  const submittedSnapshotHash =
    typeof body.snapshot_hash === "string" ? body.snapshot_hash.trim() : ""
  const currentSnapshotHash =
    typeof draft.snapshot_hash === "string" ? draft.snapshot_hash : ""

  if (
    submittedSnapshotHash &&
    currentSnapshotHash &&
    submittedSnapshotHash !== currentSnapshotHash
  ) {
    return res.status(409).json({
      error: "The product changed after this draft was reviewed. Resolve it again.",
    })
  }

  const approvedChanges = proposedChanges.filter((change) =>
    selectedChangePaths.includes(change.path)
  )

  if (
    draft.resolved_operation === "enrich" &&
    approvedChanges.length === 0 &&
    !importTargets.strapi_description_draft &&
    !importTargets.product_document_drafts
  ) {
    return res.status(400).json({
      error:
        "Select at least one metadata change or content import destination",
    })
  }

  const draftModule = getAiProductDraftModule(req)
  const actorId = getAdminActorId(req)
  const updated = await draftModule.updateAiProductDrafts({
    id: req.params.id,
    status: getAiProductDraftNextStatus("needs_review", "approved"),
    admin_notes: notes || null,
    approved_changes: approvedChanges,
    approved_import_targets: importTargets,
    approved_snapshot_hash: submittedSnapshotHash || currentSnapshotHash || null,
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
        selected_change_paths: selectedChangePaths,
        import_targets: importTargets,
        snapshot_hash: submittedSnapshotHash || currentSnapshotHash || null,
      },
    })
  )

  return res.status(200).json({ draft: updated })
}
