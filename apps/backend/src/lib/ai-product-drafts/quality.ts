import { createHash } from "node:crypto"
import { ProductResearchPacketSchema } from "./schemas"
import { normalizeV3 } from "./normalizer-v3"
import type { DraftQuality } from "./normalizer-v3"

export type QualityDraft = { raw_packet?: unknown; normalized_draft?: unknown }
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, canonical(nested)]))
  return value
}
export function draftReviewHash(draft: QualityDraft) {
  return createHash("sha256").update(JSON.stringify(canonical(draft))).digest("hex")
}
export function assessAiProductDraftQuality(input: QualityDraft): DraftQuality {
  const parsed = ProductResearchPacketSchema.safeParse(input.raw_packet)
  const blocked: DraftQuality = { version: 1, can_approve: false, product_kind: "unknown",
    blockers: ["Legacy or invalid research. Replace it with a sourced v3 packet before approval."],
    warnings: [], required_facts: 0, supported_facts: 0, content_fields: 0, supported_content_fields: 0, exact_sources: 0 }
  if (!parsed.success || parsed.data.packet_version !== 3) return blocked
  const { draft, quality } = normalizeV3(parsed.data)
  const stored = input.normalized_draft as Record<string, unknown> | undefined
  if (!stored || ["metadata", "content_draft", "claim_evidence", "product_document_suggestions"].some(key =>
    JSON.stringify(canonical(stored[key])) !== JSON.stringify(canonical(draft[key as keyof typeof draft]))
  )) {
    return { ...quality, can_approve: false, blockers: [...quality.blockers, "Draft normalization is outdated or changed. Reprocess before review."] }
  }
  return quality
}
export function assertAiProductDraftQuality(draft: QualityDraft) {
  const quality = assessAiProductDraftQuality(draft)
  if (!quality.can_approve) throw new Error(`Research required: ${quality.blockers.join(" ")}`)
}

