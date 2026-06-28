import {
  InternalAiProductDraftSchema,
  type InternalAiProductDraft,
  type ProductResearchPacket,
} from "./schemas"

type FetchResponseLike = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
  text?: () => Promise<string>
}

type FetchLike = (
  input: string,
  init: {
    method: "POST"
    headers: Record<string, string>
    body: string
  }
) => Promise<FetchResponseLike>

type DeepSeekChatCompletionResponse = {
  choices?: {
    message?: {
      content?: string | null
    }
  }[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export type DeepSeekProductDraftNormalizerOptions = {
  apiKey?: string
  baseUrl?: string
  fetch?: FetchLike
  flashModel?: string
  proModel?: string
  temperature?: number
}

export type DeepSeekProductDraftNormalizerResult = {
  draft: InternalAiProductDraft
  model: string
  trace_id?: string
}

const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com"
const DEFAULT_DEEPSEEK_FLASH_MODEL = "deepseek-v4-flash"
const DEFAULT_DEEPSEEK_PRO_MODEL = "deepseek-v4-pro"
const SAFETY_REVIEW_TERMS = [
  "certification",
  "certified",
  "compatibility",
  "compatible",
  "food",
  "safety",
  "sds",
  "warranty",
]

function getDeepSeekApiKey(options: DeepSeekProductDraftNormalizerOptions) {
  return options.apiKey || process.env.DEEPSEEK_API_KEY || ""
}

function getDeepSeekBaseUrl(options: DeepSeekProductDraftNormalizerOptions) {
  return (
    options.baseUrl ||
    process.env.DEEPSEEK_BASE_URL ||
    DEFAULT_DEEPSEEK_BASE_URL
  ).replace(/\/+$/, "")
}

function getDeepSeekTemperature(options: DeepSeekProductDraftNormalizerOptions) {
  const configured = process.env.AI_PRODUCT_DRAFT_TEMPERATURE
  const parsed =
    options.temperature ??
    (configured ? Number.parseFloat(configured) : Number.NaN)

  return Number.isFinite(parsed) ? parsed : 0.1
}

function getFetch(options: DeepSeekProductDraftNormalizerOptions): FetchLike {
  const fetcher =
    options.fetch ?? (globalThis.fetch as unknown as FetchLike | undefined)

  if (!fetcher) {
    throw new Error("DeepSeek normalizer requires a fetch implementation")
  }

  return fetcher
}

function getModelNames(options: DeepSeekProductDraftNormalizerOptions) {
  return {
    flash:
      options.flashModel ||
      process.env.AI_PRODUCT_DRAFT_MODEL_FLASH ||
      DEFAULT_DEEPSEEK_FLASH_MODEL,
    pro:
      options.proModel ||
      process.env.AI_PRODUCT_DRAFT_MODEL_PRO ||
      DEFAULT_DEEPSEEK_PRO_MODEL,
  }
}

function factConfidences(packet: ProductResearchPacket) {
  return [
    packet.facts.material.confidence,
    packet.facts.recommended_nozzle_temp_c.confidence,
    packet.facts.recommended_bed_temp_c.confidence,
    packet.facts.requires_enclosure.confidence,
    packet.facts.drying_recommended.confidence,
  ]
}

function hasSafetySensitiveSignal(packet: ProductResearchPacket) {
  const haystack = [
    ...packet.warnings,
    ...Object.values(packet.facts).flatMap((fact) =>
      "warning" in fact && fact.warning ? [fact.warning] : []
    ),
    ...packet.sources.flatMap((source) => [
      source.source_type,
      source.title,
      source.notes,
    ]),
  ]
    .join(" ")
    .toLowerCase()

  return SAFETY_REVIEW_TERMS.some((term) => haystack.includes(term))
}

export function selectDeepSeekProductDraftModel(
  packet: ProductResearchPacket,
  options: DeepSeekProductDraftNormalizerOptions = {}
) {
  const models = getModelNames(options)
  const hasLowConfidenceFact = factConfidences(packet).some(
    (value) => value > 0 && value < 0.75
  )

  return hasLowConfidenceFact || hasSafetySensitiveSignal(packet)
    ? models.pro
    : models.flash
}

function buildDeepSeekPrompt(packet: ProductResearchPacket) {
  return [
    {
      role: "system",
      content:
        "You normalize Hermes Product Research Packets into the internal AI Product Draft JSON schema. Do not browse. Do not invent claims. Claims without source evidence must stay as warnings, not metadata. Return only valid JSON with no markdown.",
    },
    {
      role: "user",
      content: JSON.stringify({
        task: "Normalize this Product Research Packet into InternalAiProductDraftSchema v1.",
        packet,
      }),
    },
  ]
}

function stripJsonFence(content: string) {
  const trimmed = content.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)

  return fenced?.[1]?.trim() || trimmed
}

function parseDeepSeekDraft(content: string) {
  try {
    return JSON.parse(stripJsonFence(content)) as unknown
  } catch {
    throw new Error("DeepSeek product draft response was not valid JSON")
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown DeepSeek error"
}

function summarizePacket(packet: ProductResearchPacket) {
  return {
    packet_version: packet.packet_version,
    source_agent: packet.source_agent,
    product_id: packet.product_id || null,
    product_handle: packet.product_handle || null,
    source_count: packet.sources.length,
    warning_count: packet.warnings.length,
  }
}

function summarizeDraft(draft: InternalAiProductDraft) {
  return {
    warning_count: draft.warnings.length,
    claim_evidence_count: draft.claim_evidence.length,
    confidence_overall: draft.confidence_summary.overall,
    document_suggestion_count: draft.product_document_suggestions.length,
  }
}

export async function normalizeProductResearchPacketWithDeepSeek(
  packet: ProductResearchPacket,
  options: DeepSeekProductDraftNormalizerOptions = {}
): Promise<DeepSeekProductDraftNormalizerResult> {
  const apiKey = getDeepSeekApiKey(options)

  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is required when AI_PRODUCT_DRAFT_NORMALIZER=deepseek")
  }

  const fetcher = getFetch(options)
  const model = selectDeepSeekProductDraftModel(packet, options)
  const endpoint = `${getDeepSeekBaseUrl(options)}/chat/completions`
  const messages = buildDeepSeekPrompt(packet)
  const {
    getActiveLangfuseTraceId,
    startActiveLangfuseTraceObservation,
    updateActiveLangfuseGeneration,
    updateActiveLangfuseTraceIO,
  } = await import("@3dbyte-tech-store/observability")
  const requestBody = {
    model,
    messages,
    response_format: { type: "json_object" },
    temperature: getDeepSeekTemperature(options),
  }

  return startActiveLangfuseTraceObservation(
    "backend.ai-product-draft.normalizer",
    async (observation) => {
      try {
        updateActiveLangfuseTraceIO({ input: summarizePacket(packet) })

        const response = await fetcher(endpoint, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const details =
            typeof response.text === "function" ? await response.text() : ""
          throw new Error(
            `DeepSeek request failed with status ${response.status}${
              details ? `: ${details.slice(0, 300)}` : ""
            }`
          )
        }

        const payload = (await response.json()) as DeepSeekChatCompletionResponse
        const content = payload.choices?.[0]?.message?.content

        if (!content) {
          throw new Error("DeepSeek response did not include draft content")
        }

        const parsed = InternalAiProductDraftSchema.parse(
          parseDeepSeekDraft(content)
        )

        updateActiveLangfuseGeneration({
          input: summarizePacket(packet),
          metadata: {
            normalizer: "deepseek",
            packet_version: packet.packet_version,
          },
          model,
          output: summarizeDraft(parsed),
          usageDetails: {
            input: payload.usage?.prompt_tokens,
            output: payload.usage?.completion_tokens,
            total: payload.usage?.total_tokens,
          },
        })
        updateActiveLangfuseTraceIO({ output: summarizeDraft(parsed) })

        return {
          draft: parsed,
          model,
          trace_id: observation.traceId || getActiveLangfuseTraceId(),
        }
      } catch (error) {
        updateActiveLangfuseGeneration({
          input: summarizePacket(packet),
          metadata: {
            normalizer: "deepseek",
            packet_version: packet.packet_version,
          },
          model,
          output: { error: getErrorMessage(error) },
          statusMessage: getErrorMessage(error),
        })
        throw error
      } finally {
        observation.end()
      }
    }
  )
}
