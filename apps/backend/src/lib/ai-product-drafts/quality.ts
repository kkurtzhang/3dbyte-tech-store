import { createHash } from "node:crypto"
import { ProductResearchPacketSchema } from "./schemas"
import { normalizeV3 } from "./normalizer-v3"
import type { DraftQuality } from "./normalizer-v3"

export type QualityDraft = {
  raw_packet?: unknown
  normalized_draft?: unknown
  resolved_operation?: unknown
  proposed_changes?: unknown
  snapshot_hash?: unknown
  approved_import_targets?: unknown
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, canonical(nested)])
    )
  return value
}
export function draftReviewHash(draft: QualityDraft) {
  const {
    raw_packet,
    normalized_draft,
    resolved_operation,
    proposed_changes,
    snapshot_hash,
  } = draft
  return createHash("sha256")
    .update(
      JSON.stringify(
        canonical({
          raw_packet,
          normalized_draft,
          resolved_operation,
          proposed_changes,
          snapshot_hash,
        })
      )
    )
    .digest("hex")
}
export function assessAiProductDraftQuality(input: QualityDraft): DraftQuality {
  const parsed = ProductResearchPacketSchema.safeParse(input.raw_packet)
  const blocked: DraftQuality = {
    version: 1,
    can_approve: false,
    product_kind: "unknown",
    blockers: [
      "Legacy or invalid research. Replace it with a sourced v3 packet before approval.",
    ],
    warnings: [],
    required_facts: 0,
    supported_facts: 0,
    content_fields: 0,
    supported_content_fields: 0,
    exact_sources: 0,
  }
  if (!parsed.success || parsed.data.packet_version !== 3) return blocked
  const { draft, quality } = normalizeV3(parsed.data)
  const stored = input.normalized_draft as Record<string, unknown> | undefined
  if (
    !stored ||
    [
      "metadata",
      "content_draft",
      "claim_evidence",
      "product_document_suggestions",
    ].some(
      (key) =>
        JSON.stringify(canonical(stored[key])) !==
        JSON.stringify(canonical(draft[key as keyof typeof draft]))
    )
  ) {
    return {
      ...quality,
      can_approve: false,
      blockers: [
        ...quality.blockers,
        "Draft normalization is outdated or changed. Reprocess before review.",
      ],
    }
  }
  return quality
}
export function assertAiProductDraftQuality(draft: QualityDraft) {
  const quality = assessAiProductDraftQuality(draft)
  if (!quality.can_approve)
    throw new Error(`Research required: ${quality.blockers.join(" ")}`)
}

export function assertReviewedAiProductDraft(draft: QualityDraft) {
  assertAiProductDraftQuality(draft)
  const approval = draft.approved_import_targets as Record<
    string,
    unknown
  > | null
  if (
    approval?.review_acknowledged !== true ||
    approval.review_hash !== draftReviewHash(draft)
  ) {
    throw new Error(
      "Research review is missing or outdated. Review and approve the current research before import."
    )
  }
}

export function withDraftQuality<T extends QualityDraft>(draft: T) {
  const quality = assessAiProductDraftQuality(draft)
  const approval = draft.approved_import_targets as Record<
    string,
    unknown
  > | null
  const review_hash = draftReviewHash(draft)
  return {
    ...draft,
    quality,
    review_hash,
    review_current:
      quality.can_approve &&
      approval?.review_acknowledged === true &&
      approval.review_hash === review_hash,
  }
}
