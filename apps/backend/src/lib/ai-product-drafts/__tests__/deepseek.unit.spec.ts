const updateActiveLangfuseGenerationMock = jest.fn()
const updateActiveLangfuseTraceIOMock = jest.fn()

jest.mock(
  "@3dbyte-tech-store/observability",
  () => ({
    getActiveLangfuseTraceId: () => "trace_active",
    startActiveLangfuseTraceObservation: (
      _name: string,
      fn: (observation: {
        end: () => void
        traceId: string
        update: (input: unknown) => void
      }) => unknown
    ) =>
      fn({
        end: jest.fn(),
        traceId: "trace_deepseek",
        update: jest.fn(),
      }),
    updateActiveLangfuseGeneration: (input: unknown) =>
      updateActiveLangfuseGenerationMock(input),
    updateActiveLangfuseTraceIO: (input: unknown) =>
      updateActiveLangfuseTraceIOMock(input),
  }),
  { virtual: true }
)

import {
  normalizeProductResearchPacketWithDeepSeek,
  selectDeepSeekProductDraftModel,
} from "../deepseek"
import { normalizeProductResearchPacketForDraft } from "../normalizer"
import { ProductResearchPacketSchema } from "../schemas"

const packetInput = {
  packet_version: 1,
  source_agent: "hermes",
  product_id: "prod_123",
  product_handle: "example-petg",
  product_input: {
    brand: "Example",
    product_name: "Example PETG",
    colour: "Black",
    diameter_mm: 1.75,
    spool_weight_g: 1000,
    supplier_url: "https://supplier.example/products/example-petg",
  },
  source_summary: {
    official_product_page: "https://manufacturer.example/example-petg",
    official_tds: "https://manufacturer.example/example-petg-tds.pdf",
    official_sds: "",
    trusted_supplier_pages: [],
  },
  facts: {
    material: {
      value: "PETG",
      source_url: "https://manufacturer.example/example-petg",
      source_type: "official_product_page",
      confidence: 0.96,
    },
    recommended_nozzle_temp_c: {
      min: 230,
      max: 250,
      source_url: "https://manufacturer.example/example-petg-tds.pdf",
      source_type: "official_tds",
      confidence: 0.92,
      warning: "",
    },
    recommended_bed_temp_c: {
      min: 70,
      max: 85,
      source_url: "https://manufacturer.example/example-petg-tds.pdf",
      source_type: "official_tds",
      confidence: 0.9,
      warning: "",
    },
    requires_enclosure: {
      value: false,
      source_url: "https://manufacturer.example/example-petg",
      source_type: "official_product_page",
      confidence: 0.82,
    },
    drying_recommended: {
      value: true,
      source_url: "https://manufacturer.example/example-petg-tds.pdf",
      source_type: "official_tds",
      confidence: 0.88,
    },
  },
  draft_content: {
    short_description: "A source-backed PETG filament draft.",
    feature_bullets: ["1.75 mm PETG filament"],
    seo_title: "Example PETG Filament",
    seo_description: "Example PETG filament for functional 3D prints.",
    ai_search_keywords: ["petg filament"],
  },
  related_content_suggestions: [],
  sources: [
    {
      url: "https://manufacturer.example/example-petg",
      source_type: "manufacturer_official",
      title: "Example PETG",
      retrieved_at: "2026-06-28T00:00:00.000Z",
      notes: "Official product page.",
    },
  ],
  warnings: [],
}

const internalDraft = {
  schema_version: 1,
  target_product: {
    product_id: "prod_123",
    product_handle: "example-petg",
    product_title: "Example PETG",
  },
  metadata: {
    ai_core: {
      schema_version: 1,
      product_kind: "filament",
      ai_search_keywords: ["petg filament"],
    },
    three_d_printing: {
      schema_version: 1,
      product_kind: "filament",
      material: "PETG",
      diameter_mm: 1.75,
    },
  },
  content_draft: {
    short_description: "A source-backed PETG filament draft.",
    feature_bullets: ["1.75 mm PETG filament"],
    seo_title: "Example PETG Filament",
    seo_description: "Example PETG filament for functional 3D prints.",
    ai_search_keywords: ["petg filament"],
  },
  related_content_suggestions: [],
  product_document_suggestions: [],
  claim_evidence: [
    {
      claim_path: "metadata.three_d_printing.material",
      value: "PETG",
      source_url: "https://manufacturer.example/example-petg",
      source_type: "official_product_page",
      confidence: 0.96,
    },
  ],
  warnings: [],
  confidence_summary: {
    overall: 0.9,
    metadata: 0.9,
    content: 0.8,
    documents: 0,
  },
}

function responseWith(content: string) {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({
      choices: [{ message: { content } }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    }),
  }
}

describe("DeepSeek AI product draft normalizer", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("selects flash for ordinary packets and pro for low-confidence or safety-sensitive packets", () => {
    const packet = ProductResearchPacketSchema.parse(packetInput)
    const lowConfidencePacket = ProductResearchPacketSchema.parse({
      ...packetInput,
      facts: {
        ...packetInput.facts,
        material: {
          ...packetInput.facts.material,
          confidence: 0.55,
        },
      },
    })
    const safetyPacket = ProductResearchPacketSchema.parse({
      ...packetInput,
      warnings: ["Warranty claim needs admin verification"],
    })

    expect(selectDeepSeekProductDraftModel(packet)).toBe("deepseek-v4-flash")
    expect(selectDeepSeekProductDraftModel(lowConfidencePacket)).toBe(
      "deepseek-v4-pro"
    )
    expect(selectDeepSeekProductDraftModel(safetyPacket)).toBe(
      "deepseek-v4-pro"
    )
  })

  it("normalizes through DeepSeek, validates the model output, and records Langfuse generation details", async () => {
    const packet = ProductResearchPacketSchema.parse(packetInput)
    const fetch = jest.fn().mockResolvedValue(
      responseWith(`\`\`\`json\n${JSON.stringify(internalDraft)}\n\`\`\``)
    )

    const result = await normalizeProductResearchPacketWithDeepSeek(packet, {
      apiKey: "deepseek-secret",
      fetch,
    })

    expect(result.draft.metadata.three_d_printing?.material).toBe("PETG")
    expect(result.model).toBe("deepseek-v4-flash")
    expect(result.trace_id).toBe("trace_deepseek")
    expect(fetch).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer deepseek-secret",
        }),
      })
    )
    expect(updateActiveLangfuseGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-v4-flash",
        usageDetails: { input: 10, output: 20, total: 30 },
      })
    )
  })

  it("fails when DeepSeek returns JSON that does not match the internal draft schema", async () => {
    const packet = ProductResearchPacketSchema.parse(packetInput)
    const fetch = jest.fn().mockResolvedValue(responseWith("{}"))

    await expect(
      normalizeProductResearchPacketWithDeepSeek(packet, {
        apiKey: "deepseek-secret",
        fetch,
      })
    ).rejects.toThrow()
  })

  it("uses the DeepSeek path only when the AI product draft normalizer env flag is enabled", async () => {
    const packet = ProductResearchPacketSchema.parse(packetInput)
    const fetch = jest.fn().mockResolvedValue(
      responseWith(JSON.stringify(internalDraft))
    )

    const deterministic = await normalizeProductResearchPacketForDraft(packet, {
      env: {},
      fetch,
    })
    const deepseek = await normalizeProductResearchPacketForDraft(packet, {
      apiKey: "deepseek-secret",
      env: { AI_PRODUCT_DRAFT_NORMALIZER: "deepseek" },
      fetch,
    })

    expect(deterministic.normalizer).toBe("deterministic")
    expect(deepseek.normalizer).toBe("deepseek:deepseek-v4-flash")
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
