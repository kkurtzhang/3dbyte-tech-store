import { packetV3 } from "./quality-fixture"
import { ProductResearchPacketSchema } from "../schemas"
import { normalizeProductResearchPacket } from "../normalizer"
import { draftReviewHash } from "../quality"

const evidence = { ...packetV3.classification }
export const filamentPacket = ProductResearchPacketSchema.parse({
  ...packetV3,
  product_input: { ...packetV3.product_input, product_name: "Example PETG" },
  classification: { ...evidence, kind: "filament" },
  facts: Object.entries({
    material: "PETG",
    diameter_mm: 1.75,
    recommended_nozzle_temp_c: { min: 230, max: 250 },
    recommended_bed_temp_c: { min: 70, max: 85 },
  }).map(([field, value]) => ({
    source_ids: evidence.source_ids,
    evidence_excerpt: evidence.evidence_excerpt,
    confidence: 0.95,
    warning: "",
    field,
    value,
    applicability: "known",
  })),
  sources: packetV3.sources.map((s) => ({
    ...s,
    url: "https://manufacturer.example/tds.pdf",
    source_type: "official_tds",
    title: "Example PETG TDS",
  })),
  draft_content: {
    short_description: "<script>alert(1)</script>Source backed PETG.",
    feature_bullets: ["<b>Functional</b> parts"],
    seo_title: "Example PETG",
    seo_description: "Source backed PETG.",
    ai_search_keywords: ["petg"],
  },
})
export const normalizedFilamentDraft =
  normalizeProductResearchPacket(filamentPacket)

/** Construct a genuinely quality-valid reviewed packet, without mocking the quality gate. */
export function reviewedFixture<T extends Record<string, unknown>>(input: T) {
  const old = input.normalized_draft as { target_product?: unknown } | undefined
  const draft = {
    ...input,
    raw_packet: filamentPacket,
    normalized_draft: {
      ...normalizedFilamentDraft,
      ...(old?.target_product ? { target_product: old.target_product } : {}),
    },
  }
  return {
    ...draft,
    approved_import_targets: {
      medusa_metadata: true,
      strapi_description_draft: true,
      product_document_drafts: true,
      ...((input.approved_import_targets as Record<string, unknown>) || {}),
      review_acknowledged: true,
      review_hash: draftReviewHash(draft),
    },
  }
}
