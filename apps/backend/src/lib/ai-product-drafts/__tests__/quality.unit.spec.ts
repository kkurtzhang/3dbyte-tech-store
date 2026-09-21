import { normalizeProductResearchPacket } from "../normalizer"
import { ProductResearchPacketSchema } from "../schemas"
import { buildAiProductDraftChangeSet } from "../resolution"
import { packetV3 } from "./quality-fixture"

const legacy = require("../../../../../..//docs/hermes/fixtures/product-research-packet.v1.example.json")
const assessAiProductDraftQuality = (draft: unknown) => require("../quality").assessAiProductDraftQuality(draft)

describe("AI draft evidence and category quality", () => {
  it("does not label a legacy hotend as filament or promote its maximum to print settings", () => {
    const packet = ProductResearchPacketSchema.parse({
      ...legacy,
      product_input: { ...legacy.product_input, product_name: "Creality K1C OEM Ceramic Hotend Kit" },
      facts: { ...legacy.facts, recommended_nozzle_temp_c: {
        min: 0, max: 300, source_url: legacy.sources[0].url,
        source_type: "official_product_page", confidence: 0.8,
        warning: "Hotend capability, not a recommended printing temperature.",
      } },
    })
    const draft = normalizeProductResearchPacket(packet)
    expect(draft.metadata.ai_core?.product_kind).not.toBe("filament")
    expect(draft.metadata.three_d_printing?.recommended_nozzle_temp_c).toBeUndefined()
    expect(draft.warnings.join(" ")).toContain("Hotend capability")
    expect(assessAiProductDraftQuality({ raw_packet: packet, normalized_draft: draft }).can_approve).toBe(false)
  })

  it("normalizes sourced hotend facts without filament-only fields", () => {
    const draft = normalizeProductResearchPacket(ProductResearchPacketSchema.parse(packetV3))
    expect(draft.metadata.ai_core?.product_kind).toBe("hotend")
    expect(draft.metadata.three_d_printing?.max_temperature_c).toBe(300)
    expect(draft.metadata.three_d_printing?.recommended_nozzle_temp_c).toBeUndefined()
    expect(draft.product_document_suggestions[0]).toMatchObject({ document_type: "manual", source_kind: "official_manual" })
    const quality = assessAiProductDraftQuality({ raw_packet: packetV3, normalized_draft: draft })
    expect(quality.can_approve).toBe(true)
    const changes = buildAiProductDraftChangeSet({ current_product: { id: "new" }, normalized_draft: draft })
    expect(changes).toEqual(expect.arrayContaining([expect.objectContaining({ path: "metadata.ai_core.product_kind" })]))
  })

  it("does not give empty copy a default confidence or approval eligibility", () => {
    const packet = { ...packetV3, draft_content: { short_description: "", feature_bullets: [], seo_title: "", seo_description: "", ai_search_keywords: [] }, content_evidence: [] }
    const draft = normalizeProductResearchPacket(ProductResearchPacketSchema.parse(packet))
    expect(draft.confidence_summary.content).toBe(0)
    expect(assessAiProductDraftQuality({ raw_packet: packet, normalized_draft: draft }).can_approve).toBe(false)
  })

  it("blocks missing evidence, background sources, caveats, and unrelated category fields", () => {
    for (const change of [
      { sources: packetV3.sources.map(s => ({ ...s, product_match: "background" })) },
      { classification: { ...packetV3.classification, source_ids: ["missing"] } },
      { facts: packetV3.facts.map(f => ({ ...f, warning: "Inferred from another model" })) },
      { facts: [...packetV3.facts, { ...packetV3.facts[0], field: "recommended_nozzle_temp_c", value: { min: 200, max: 300 } }] },
      { content_evidence: [] },
    ]) {
      const packet = ProductResearchPacketSchema.parse({ ...packetV3, ...change })
      const draft = normalizeProductResearchPacket(packet)
      expect(assessAiProductDraftQuality({ raw_packet: packet, normalized_draft: draft }).can_approve).toBe(false)
    }
  })

  it("rejects reversed ranges and metadata tampering", () => {
    expect(ProductResearchPacketSchema.safeParse({ ...packetV3, facts: [{ ...packetV3.facts[0], field: "recommended_nozzle_temp_c", value: { min: 300, max: 200 } }] }).success).toBe(false)
    const draft = normalizeProductResearchPacket(ProductResearchPacketSchema.parse(packetV3))
    draft.metadata.ai_core!.product_kind = "filament"
    expect(assessAiProductDraftQuality({ raw_packet: packetV3, normalized_draft: draft }).can_approve).toBe(false)
  })

  it("does not default-select weak or caveated changes", () => {
    const draft = normalizeProductResearchPacket(ProductResearchPacketSchema.parse(packetV3))
    draft.claim_evidence[0].confidence = 0.2
    const changes = buildAiProductDraftChangeSet({ current_product: { id: "new" }, normalized_draft: draft })
    expect(changes[0].default_selected).toBe(false)
  })
})
