export const AI_PRODUCT_DRAFT_STATUSES = [
  "received",
  "validation_failed",
  "needs_review",
  "approved",
  "rejected",
  "imported",
] as const

export type AiProductDraftStatus = (typeof AI_PRODUCT_DRAFT_STATUSES)[number]

export type AiProductDraftTransition =
  | "validated"
  | "validation_failed"
  | "approved"
  | "rejected"
  | "imported"

type DraftStatusInput = {
  id: string
  status: string
}

type DraftEventInput = {
  draft_id: string
  type: string
  actor_type: "hermes" | "admin" | "system" | "deepseek"
  actor_id?: string | null
  from_status?: string | null
  to_status?: string | null
  metadata?: Record<string, unknown> | null
}

export function getAiProductDraftNextStatus(
  currentStatus: AiProductDraftStatus,
  transition: AiProductDraftTransition
): AiProductDraftStatus {
  if (currentStatus === "received" && transition === "validated") {
    return "needs_review"
  }

  if (currentStatus === "received" && transition === "validation_failed") {
    return "validation_failed"
  }

  if (currentStatus === "needs_review" && transition === "approved") {
    return "approved"
  }

  if (
    ["received", "validation_failed", "needs_review", "approved"].includes(
      currentStatus
    ) &&
    transition === "rejected"
  ) {
    return "rejected"
  }

  if (currentStatus === "approved" && transition === "imported") {
    return "imported"
  }

  throw new Error(
    `Cannot apply AI product draft transition ${transition} from ${currentStatus}`
  )
}

export function assertAiProductDraftCanImport(draft: DraftStatusInput) {
  if (draft.status !== "approved") {
    throw new Error("Only approved AI product drafts can be imported")
  }
}

export function buildAiProductDraftEvent(input: DraftEventInput) {
  return {
    draft_id: input.draft_id,
    type: input.type,
    actor_type: input.actor_type,
    actor_id: input.actor_id || null,
    from_status: input.from_status || null,
    to_status: input.to_status || null,
    metadata: input.metadata || null,
  }
}
