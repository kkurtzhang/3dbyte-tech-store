import { createHash } from "node:crypto"

export type AiProductDraftOperation = "create" | "enrich"
export type AiProductDraftRequestedOperation =
  | AiProductDraftOperation
  | "auto"
export type AiProductDraftResolutionStatus =
  | "resolved"
  | "needs_resolution"
  | "validation_failed"

export type AiProductDraftCandidate = {
  id: string
  handle?: string | null
  title?: string | null
  metadata?: unknown
}

type ResolveOperationInput = {
  requested_operation: AiProductDraftRequestedOperation
  product_id?: string | null
  product_handle?: string | null
  candidates: AiProductDraftCandidate[]
}

export type AiProductDraftOperationResolution = {
  operation: AiProductDraftOperation | null
  resolution_status: AiProductDraftResolutionStatus
  target: AiProductDraftCandidate | null
  reason:
    | "explicit_target"
    | "single_existing_match"
    | "no_existing_match"
    | "create_candidate_conflict"
    | "ambiguous_existing_match"
    | "missing_enrichment_target"
}

export type AiProductDraftClaimEvidence = {
  claim_path: string
  value: unknown
  source_url: string
  source_type: string
  confidence: number
}

export type AiProductDraftChange = {
  path: string
  current_value: unknown
  proposed_value: unknown
  disposition: "missing" | "conflict"
  default_selected: boolean
  evidence: AiProductDraftClaimEvidence
}

type BuildChangeSetInput = {
  current_product: AiProductDraftCandidate
  normalized_draft: Record<string, unknown> & {
    metadata?: unknown
    claim_evidence?: unknown
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, canonicalize(nestedValue)])
    )
  }

  return value
}

const valuesEqual = (left: unknown, right: unknown) =>
  JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))

const isMissing = (value: unknown) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.trim() === "")

const getPathValue = (value: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((current, segment) => {
    return asRecord(current)[segment]
  }, value)

const normalizeEvidence = (value: unknown): AiProductDraftClaimEvidence | null => {
  const record = asRecord(value)
  const claimPath = asString(record.claim_path)
  const sourceUrl = asString(record.source_url)
  const sourceType = asString(record.source_type)
  const confidence = Number(record.confidence)

  if (
    !claimPath ||
    !sourceUrl.startsWith("http") ||
    !sourceType ||
    !Number.isFinite(confidence)
  ) {
    return null
  }

  return {
    claim_path: claimPath,
    value: record.value,
    source_url: sourceUrl,
    source_type: sourceType,
    confidence,
  }
}

export function resolveAiProductDraftOperation({
  requested_operation,
  product_id,
  product_handle,
  candidates,
}: ResolveOperationInput): AiProductDraftOperationResolution {
  const targetId = asString(product_id)
  const targetHandle = asString(product_handle)
  const explicitTarget = candidates.find((candidate) => {
    return (
      (targetId && candidate.id === targetId) ||
      (targetHandle && candidate.handle === targetHandle)
    )
  })

  if (targetId || targetHandle) {
    if (!explicitTarget) {
      return {
        operation: null,
        resolution_status: "validation_failed",
        target: null,
        reason: "missing_enrichment_target",
      }
    }

    if (requested_operation === "create") {
      return {
        operation: null,
        resolution_status: "needs_resolution",
        target: null,
        reason: "create_candidate_conflict",
      }
    }

    return {
      operation: "enrich",
      resolution_status: "resolved",
      target: explicitTarget,
      reason: "explicit_target",
    }
  }

  if (requested_operation === "enrich" && candidates.length === 0) {
    return {
      operation: null,
      resolution_status: "validation_failed",
      target: null,
      reason: "missing_enrichment_target",
    }
  }

  if (candidates.length > 1) {
    return {
      operation: null,
      resolution_status: "needs_resolution",
      target: null,
      reason: "ambiguous_existing_match",
    }
  }

  if (candidates.length === 1) {
    if (requested_operation === "create") {
      return {
        operation: null,
        resolution_status: "needs_resolution",
        target: null,
        reason: "create_candidate_conflict",
      }
    }

    return {
      operation: "enrich",
      resolution_status: "resolved",
      target: candidates[0],
      reason: "single_existing_match",
    }
  }

  return {
    operation: "create",
    resolution_status: "resolved",
    target: null,
    reason: "no_existing_match",
  }
}

export function buildAiProductDraftChangeSet({
  current_product,
  normalized_draft,
}: BuildChangeSetInput): AiProductDraftChange[] {
  const evidenceEntries = Array.isArray(normalized_draft.claim_evidence)
    ? normalized_draft.claim_evidence
        .map(normalizeEvidence)
        .filter((entry): entry is AiProductDraftClaimEvidence => Boolean(entry))
    : []
  const currentState = {
    metadata: asRecord(current_product.metadata),
  }
  const proposedState = {
    metadata: asRecord(normalized_draft.metadata),
  }

  return evidenceEntries.flatMap((evidence) => {
    const currentValue = getPathValue(currentState, evidence.claim_path)
    const proposedValue = getPathValue(proposedState, evidence.claim_path)

    if (proposedValue === undefined || valuesEqual(currentValue, proposedValue)) {
      return []
    }

    const missing = isMissing(currentValue)

    return [
      {
        path: evidence.claim_path,
        current_value: currentValue,
        proposed_value: proposedValue,
        disposition: missing ? ("missing" as const) : ("conflict" as const),
        default_selected: missing,
        evidence,
      },
    ]
  })
}

export function buildAiProductSnapshotHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")
}
