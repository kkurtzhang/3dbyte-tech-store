import {
  InternalAiProductDraftSchema,
  type InternalAiProductDraft,
  type ProductResearchPacket,
} from "./schemas"
import {
  normalizeProductResearchPacketWithDeepSeek,
  type DeepSeekProductDraftNormalizerOptions,
} from "./deepseek"

type EvidenceInput = {
  claim_path: string
  value: unknown
  source_url: string
  source_type: ProductResearchPacket["facts"]["material"]["source_type"]
  confidence: number
}

function hasEvidence(input: {
  source_url: string
  source_type: ProductResearchPacket["facts"]["material"]["source_type"]
}) {
  return Boolean(input.source_url.trim() && input.source_type.trim())
}

function compactArray(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function addEvidence(
  evidence: EvidenceInput[],
  warnings: string[],
  input: EvidenceInput
): boolean {
  if (!hasEvidence(input)) {
    warnings.push(`${input.claim_path} has no source evidence and was not imported`)
    return false
  }

  evidence.push(input)
  return true
}

function average(values: number[]) {
  const finiteValues = values.filter((value) => Number.isFinite(value))

  if (!finiteValues.length) {
    return 0
  }

  return Number(
    (
      finiteValues.reduce((total, value) => total + value, 0) /
      finiteValues.length
    ).toFixed(2)
  )
}

export function normalizeProductResearchPacket(
  packet: ProductResearchPacket
): InternalAiProductDraft {
  const warnings = [...packet.warnings]
  const claimEvidence: EvidenceInput[] = []
  const metadataConfidences: number[] = []
  const threeDPrinting: NonNullable<
    InternalAiProductDraft["metadata"]["three_d_printing"]
  > = {
    schema_version: 1,
    product_kind: "filament",
  }

  const material = packet.facts.material
  if (
    material.value &&
    addEvidence(claimEvidence, warnings, {
      claim_path: "metadata.three_d_printing.material",
      value: material.value,
      source_url: material.source_url,
      source_type: material.source_type,
      confidence: material.confidence,
    })
  ) {
    threeDPrinting.material = material.value
    metadataConfidences.push(material.confidence)
  }

  if (packet.product_input.diameter_mm !== null) {
    threeDPrinting.diameter_mm = packet.product_input.diameter_mm
  }

  const nozzleTemp = packet.facts.recommended_nozzle_temp_c
  if (
    (nozzleTemp.min !== null || nozzleTemp.max !== null) &&
    addEvidence(claimEvidence, warnings, {
      claim_path: "metadata.three_d_printing.recommended_nozzle_temp_c",
      value: { min: nozzleTemp.min, max: nozzleTemp.max },
      source_url: nozzleTemp.source_url,
      source_type: nozzleTemp.source_type,
      confidence: nozzleTemp.confidence,
    })
  ) {
    threeDPrinting.recommended_nozzle_temp_c = {
      ...(nozzleTemp.min !== null ? { min: nozzleTemp.min } : {}),
      ...(nozzleTemp.max !== null ? { max: nozzleTemp.max } : {}),
    }
    metadataConfidences.push(nozzleTemp.confidence)
  }

  const bedTemp = packet.facts.recommended_bed_temp_c
  if (
    (bedTemp.min !== null || bedTemp.max !== null) &&
    addEvidence(claimEvidence, warnings, {
      claim_path: "metadata.three_d_printing.recommended_bed_temp_c",
      value: { min: bedTemp.min, max: bedTemp.max },
      source_url: bedTemp.source_url,
      source_type: bedTemp.source_type,
      confidence: bedTemp.confidence,
    })
  ) {
    threeDPrinting.recommended_bed_temp_c = {
      ...(bedTemp.min !== null ? { min: bedTemp.min } : {}),
      ...(bedTemp.max !== null ? { max: bedTemp.max } : {}),
    }
    metadataConfidences.push(bedTemp.confidence)
  }

  const enclosure = packet.facts.requires_enclosure
  if (
    enclosure.value !== null &&
    addEvidence(claimEvidence, warnings, {
      claim_path: "metadata.three_d_printing.requires_enclosure",
      value: enclosure.value,
      source_url: enclosure.source_url,
      source_type: enclosure.source_type,
      confidence: enclosure.confidence,
    })
  ) {
    threeDPrinting.requires_enclosure = enclosure.value
    metadataConfidences.push(enclosure.confidence)
  }

  const drying = packet.facts.drying_recommended
  if (
    drying.value !== null &&
    addEvidence(claimEvidence, warnings, {
      claim_path: "metadata.three_d_printing.drying_recommended",
      value: drying.value,
      source_url: drying.source_url,
      source_type: drying.source_type,
      confidence: drying.confidence,
    })
  ) {
    threeDPrinting.drying_recommended = drying.value
    metadataConfidences.push(drying.confidence)
  }

  const keywords = compactArray(packet.draft_content.ai_search_keywords)
  const contentConfidence = average(
    packet.related_content_suggestions.map((suggestion) => suggestion.confidence)
  )

  const draft: InternalAiProductDraft = {
    schema_version: 1,
    target_product: {
      product_id: packet.product_id || undefined,
      product_handle: packet.product_handle || undefined,
      product_title: packet.product_input.product_name || undefined,
    },
    metadata: {
      ai_core: {
        schema_version: 1,
        product_kind: "filament",
        ai_search_keywords: keywords,
      },
      three_d_printing: threeDPrinting,
    },
    content_draft: {
      short_description: packet.draft_content.short_description,
      feature_bullets: compactArray(packet.draft_content.feature_bullets),
      seo_title: packet.draft_content.seo_title,
      seo_description: packet.draft_content.seo_description,
      ai_search_keywords: keywords,
    },
    related_content_suggestions: packet.related_content_suggestions,
    product_document_suggestions: packet.sources
      .filter((source) => source.url.startsWith("https://"))
      .map((source) => ({
        title: source.title,
        document_type:
          source.source_type === "official_sds"
            ? ("safety_sheet" as const)
            : source.source_type === "official_tds"
              ? ("datasheet" as const)
              : ("other" as const),
        source_url: source.url,
        source_kind:
          source.source_type === "manufacturer_official"
            ? ("official_product_page" as const)
            : source.source_type === "official_sds"
              ? ("official_safety_sheet" as const)
              : source.source_type === "official_tds"
                ? ("official_datasheet" as const)
                : ("supplier_product_page" as const),
        source_label: source.title,
        source_checked_at: source.retrieved_at,
        search_keywords: keywords,
        confidence: 0.8,
      })),
    claim_evidence: claimEvidence,
    warnings,
    confidence_summary: {
      overall: average([
        average(metadataConfidences),
        contentConfidence || 0.75,
        packet.sources.length ? 0.8 : 0,
      ]),
      metadata: average(metadataConfidences),
      content: contentConfidence || 0.75,
      documents: packet.sources.length ? 0.8 : 0,
    },
  }

  return InternalAiProductDraftSchema.parse(draft)
}

export type ProductResearchNormalizationResult = {
  draft: InternalAiProductDraft
  normalizer: string
  trace_id?: string
}

export type ProductResearchNormalizerProvider = "deterministic" | "deepseek"

export type ProductResearchNormalizationOptions =
  DeepSeekProductDraftNormalizerOptions & {
    env?: NodeJS.ProcessEnv
  }

export function resolveAiProductDraftNormalizerProvider(
  env: NodeJS.ProcessEnv = process.env
): ProductResearchNormalizerProvider {
  const provider = env.AI_PRODUCT_DRAFT_NORMALIZER?.trim().toLowerCase()

  return provider === "deepseek" ? "deepseek" : "deterministic"
}

export async function normalizeProductResearchPacketForDraft(
  packet: ProductResearchPacket,
  options: ProductResearchNormalizationOptions = {}
): Promise<ProductResearchNormalizationResult> {
  const provider = resolveAiProductDraftNormalizerProvider(options.env)

  if (provider === "deepseek") {
    const result = await normalizeProductResearchPacketWithDeepSeek(packet, options)

    return {
      draft: result.draft,
      normalizer: `deepseek:${result.model}`,
      trace_id: result.trace_id,
    }
  }

  return {
    draft: normalizeProductResearchPacket(packet),
    normalizer: "deterministic",
  }
}
