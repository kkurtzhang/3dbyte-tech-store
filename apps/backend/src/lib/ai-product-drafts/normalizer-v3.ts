import { InternalAiProductDraftSchema } from "./schemas"
import { isFieldApplicable, requiredFacts } from "./product-fields"
import type { InternalAiProductDraft, ProductResearchPacketV3 } from "./schemas"

export type DraftQuality = {
  version: 1
  can_approve: boolean
  product_kind: string
  blockers: string[]
  warnings: string[]
  required_facts: number
  supported_facts: number
  content_fields: number
  supported_content_fields: number
  exact_sources: number
}
type Evidence = ProductResearchPacketV3["classification"]
export function contentEntries(
  content: ProductResearchPacketV3["draft_content"]
) {
  return Object.entries(content)
    .flatMap(([field, value]) =>
      Array.isArray(value)
        ? value.map((text, index) => ({ field: `${field}.${index}`, text }))
        : [{ field, text: value }]
    )
    .filter((entry) => entry.text.trim())
}
export function normalizeV3(packet: ProductResearchPacketV3): {
  draft: InternalAiProductDraft
  quality: DraftQuality
} {
  const blockers: string[] = []
  const warnings = [...packet.warnings]
  const kind = packet.classification.kind
  const sources = new Map(packet.sources.map((source) => [source.id, source]))
  const usedSources = new Set<string>()
  if (sources.size !== packet.sources.length)
    blockers.push("Source identifiers must be unique.")
  if (new Set(packet.facts.map((f) => f.field)).size !== packet.facts.length)
    blockers.push("Fact fields must be unique.")
  if (
    new Set(packet.content_evidence.map((f) => f.field)).size !==
    packet.content_evidence.length
  )
    blockers.push("Content evidence fields must be unique.")
  const validateEvidence = (entry: Omit<Evidence, "kind">, label: string) => {
    if (entry.warning) warnings.push(`${label}: ${entry.warning}`)
    const valid =
      entry.confidence >= 0.8 &&
      !entry.warning &&
      !!entry.evidence_excerpt.trim() &&
      entry.source_ids.length > 0 &&
      entry.source_ids.every((id) => {
        const source = sources.get(id)
        return (
          source &&
          source.product_match === "exact" &&
          source.source_type !== "other" &&
          source.url.startsWith("https://") &&
          !!source.title.trim() &&
          Date.parse(source.retrieved_at) <= Date.now() + 86400000
        )
      })
    if (!valid)
      blockers.push(
        `${label}: needs exact-product source evidence, an excerpt, and resolution of weak or caveated claims.`
      )
    else entry.source_ids.forEach((id) => usedSources.add(id))
    return valid
  }
  const claimEvidence: InternalAiProductDraft["claim_evidence"] = []
  const addClaim = (
    path: string,
    value: unknown,
    evidence: Omit<Evidence, "kind">
  ) => {
    const source = sources.get(evidence.source_ids[0])!
    claimEvidence.push({
      claim_path: path,
      value,
      source_url: source.url,
      source_type: source.source_type,
      confidence: evidence.confidence,
      warning: evidence.warning,
      evidence_excerpt: evidence.evidence_excerpt,
    })
  }
  const metadata: InternalAiProductDraft["metadata"] = {
    ai_core: { schema_version: 1 },
    three_d_printing: { schema_version: 1 },
  }
  if (validateEvidence(packet.classification, "Product kind")) {
    metadata.ai_core!.product_kind = kind
    metadata.three_d_printing!.product_kind = kind
    addClaim("metadata.ai_core.product_kind", kind, packet.classification)
    addClaim(
      "metadata.three_d_printing.product_kind",
      kind,
      packet.classification
    )
  }
  const supported = new Set<string>()
  for (const fact of packet.facts) {
    if (fact.applicability !== "known") {
      if (fact.warning) warnings.push(`${fact.field}: ${fact.warning}`)
      continue
    }
    if (!isFieldApplicable(kind, fact.field)) {
      blockers.push(`${fact.field} is not applicable to ${kind}.`)
      continue
    }
    if (validateEvidence(fact, fact.field)) {
      metadata.three_d_printing = {
        ...metadata.three_d_printing!,
        [fact.field]: fact.value,
      }
      addClaim(`metadata.three_d_printing.${fact.field}`, fact.value, fact)
      supported.add(fact.field)
    }
  }
  for (const field of requiredFacts[kind]) {
    if (!supported.has(field))
      blockers.push(`Research required: ${field} for ${kind}.`)
  }
  if (
    !packet.product_input.product_name.trim() ||
    /^(test product|online-check)$/i.test(packet.product_input.product_name)
  ) {
    blockers.push("A real, identified product is required.")
  }
  if (!packet.draft_content.short_description.trim())
    blockers.push("A sourced product description is required.")
  const entries = contentEntries(packet.draft_content)
  let supportedContent = 0
  for (const entry of entries) {
    const evidence = packet.content_evidence.find(
      (e) => e.field === entry.field
    )
    if (!evidence)
      blockers.push(`Research required: evidence for ${entry.field}.`)
    else if (validateEvidence(evidence, entry.field)) supportedContent++
  }
  for (const evidence of packet.content_evidence) {
    if (!entries.some((entry) => entry.field === evidence.field))
      blockers.push(`Content evidence ${evidence.field} has no matching text.`)
  }
  // Keywords use the same evidence checks as every other content field.
  if (
    packet.draft_content.ai_search_keywords.length &&
    packet.draft_content.ai_search_keywords.every((_, i) =>
      packet.content_evidence.some(
        (e) =>
          e.field === `ai_search_keywords.${i}` &&
          e.confidence >= 0.8 &&
          !e.warning &&
          e.evidence_excerpt &&
          e.source_ids.length &&
          e.source_ids.every((id) => usedSources.has(id))
      )
    )
  ) {
    metadata.ai_core!.ai_search_keywords =
      packet.draft_content.ai_search_keywords
    addClaim(
      "metadata.ai_core.ai_search_keywords",
      packet.draft_content.ai_search_keywords,
      packet.content_evidence.find((e) => e.field === "ai_search_keywords.0")!
    )
  }
  const exactSources = packet.sources.filter((s) => usedSources.has(s.id))
  const documentTypes = {
    official_manual: ["manual", "official_manual"],
    official_tds: ["datasheet", "official_datasheet"],
    official_sds: ["safety_sheet", "official_safety_sheet"],
    manufacturer_official: ["other", "official_product_page"],
    official_product_page: ["other", "official_product_page"],
    trusted_supplier: ["other", "supplier_product_page"],
    supplier_product_page: ["other", "supplier_product_page"],
    other: ["other", "supplier_product_page"],
  } as const
  const metadataCoverage =
    requiredFacts[kind].filter((f) => supported.has(f)).length /
    requiredFacts[kind].length
  const contentCoverage = entries.length ? supportedContent / entries.length : 0
  const quality: DraftQuality = {
    version: 1,
    can_approve: blockers.length === 0,
    product_kind: kind,
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
    required_facts: requiredFacts[kind].length,
    supported_facts: requiredFacts[kind].filter((f) => supported.has(f)).length,
    content_fields: entries.length,
    supported_content_fields: supportedContent,
    exact_sources: exactSources.length,
  }
  const draft = InternalAiProductDraftSchema.parse({
    schema_version: 1,
    target_product: {
      product_id: packet.product_id || undefined,
      product_handle: packet.product_handle || undefined,
      product_title: packet.product_input.product_name,
    },
    metadata,
    content_draft: packet.draft_content,
    related_content_suggestions: packet.related_content_suggestions,
    product_document_suggestions: exactSources.map((s) => ({
      title: s.title,
      document_type: documentTypes[s.source_type][0],
      source_kind: documentTypes[s.source_type][1],
      source_url: s.url,
      source_label: s.title.slice(0, 120),
      source_checked_at: s.retrieved_at,
      search_keywords: packet.draft_content.ai_search_keywords.slice(0, 20),
      confidence: Math.min(
        ...[packet.classification, ...packet.facts, ...packet.content_evidence]
          .filter((e) => e.source_ids.includes(s.id) && e.confidence >= 0.8)
          .map((e) => e.confidence)
      ),
    })),
    claim_evidence: claimEvidence,
    warnings: quality.warnings,
    // Compatibility only; the Admin shows coverage and blockers, not "accuracy".
    confidence_summary: {
      overall: Number(((metadataCoverage + contentCoverage) / 2).toFixed(2)),
      metadata: metadataCoverage,
      content: contentCoverage,
      documents: exactSources.length ? 1 : 0,
    },
  })
  return { draft, quality }
}
