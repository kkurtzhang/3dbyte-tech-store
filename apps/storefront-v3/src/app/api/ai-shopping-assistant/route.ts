import { randomUUID } from "node:crypto"
import { createOpenAI } from "@ai-sdk/openai"
import {
  getActiveLangfuseTraceId,
  isAiTelemetryEnabled,
  propagateActiveLangfuseTraceAttributes,
  startActiveLangfuseTraceObservation,
  updateActiveLangfuseGeneration,
  updateActiveLangfuseTraceIO,
} from "@3dbyte-tech-store/observability"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
} from "ai"
import { z } from "zod"

import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url"
import { getReleaseSha } from "@/lib/release-identity"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit"

import { getProductLookupDecision, isExplicitProductBrowse, prepareProductLinkStep } from "./product-link-routing"
import { createProductActionTransform, createProductSearchExecution } from "./product-search-execution"
import { assistantMessageSchema, getAssistantMessageContent, toUiMessages, type AssistantMessage } from "./history"

import { callSupportBackend, getSupportSession, isSupportSameOrigin, withSupportSession } from "./support-session"

import { readAssistantJson } from "./read-request"

import { resolveAssistantSystemPrompt } from "./prompt-management"
import { createKnowledgeExecution } from "./knowledge-execution"
import { createKnowledgeGroundingTransform } from "./knowledge-grounding"
import {
  collectEmailAddresses,
  maskCompleteEmailAddresses,
} from "./visible-output-sanitizer"

const DEFAULT_AI_MODEL = "deepseek-flash"
const DEFAULT_AI_ASSISTANT_TEMPERATURE = 0.2
const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com"
const DEEPSEEK_NON_THINKING_MODE = { type: "disabled" } as const
const ASSISTANT_CHATBOT_ID = "storefront.shopping-assistant"
const ASSISTANT_SURFACE = "storefront-floating-drawer"
const ASSISTANT_TRACE_NAME = "storefront.ai-shopping-assistant"
const ASSISTANT_TRACE_TAGS = [
  "ai-chatbot",
  "storefront",
  "shopping-assistant",
  ASSISTANT_CHATBOT_ID,
]
const CUSTOMER_EVAL_TRACE_ID_REQUEST_HEADER = "x-3db-customer-ai-eval-run"
const LANGFUSE_TRACE_ID_HEADER = "x-3db-langfuse-trace-id"
const AI_MODEL_HEADER = "x-3db-ai-model"
const AI_TEMPERATURE_HEADER = "x-3db-ai-temperature"
const AI_PROMPT_VERSION_HEADER = "x-3db-ai-prompt-version"
const AI_GUARDRAILS_VERSION_HEADER = "x-3db-ai-guardrails-version"
const RELEASE_SHA_HEADER = "x-3db-release-sha"
const TRACE_CONTEXT_ID_PATTERN = /^[a-zA-Z0-9._:-]+$/
const TRACE_REFERENCE_PATTERN =
  /\b(?:CASE|INV|ORDER|ORD|REF|RMA|SUP|TICKET|TKT)-[A-Z0-9-]+\b/gi
const TRACE_COMMERCE_ID_PATTERN =
  /\b(?:cart|claim|cus|customer|doc|ful|order|payment|pay|pi|price|prod|product|region|ship|track|variant)_[a-zA-Z0-9_:-]{6,}\b/g

const assistantRequestSchema = z.object({
  messages: z.array(assistantMessageSchema).min(1).max(20),
  traceContext: z
    .object({
      chatbotId: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(TRACE_CONTEXT_ID_PATTERN)
        .optional(),
      sessionId: z
        .string()
        .trim()
        .min(1)
        .max(160)
        .regex(TRACE_CONTEXT_ID_PATTERN)
        .optional(),
      surface: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(TRACE_CONTEXT_ID_PATTERN)
        .optional(),
      userId: z
        .string()
        .trim()
        .min(1)
        .max(160)
        .regex(TRACE_CONTEXT_ID_PATTERN)
        .optional(),
    })
    .strict()
    .optional(),
})

const productSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(200),
  limit: z.number().int().min(1).max(6).default(4),
})

const knowledgeSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(120),
  product_id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(),
  variant_id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(),
  limit: z.number().int().min(1).max(4).default(4),
}).strict()

const orderProofInputSchema = z.object({
  reference: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
})

const shippingEstimateInputSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(99).default(1),
      }),
    )
    .min(1)
    .max(20),
  destination: z.object({
    city: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(12),
    countryCode: z.string().trim().length(2).default("AU"),
    province: z.string().trim().max(16).optional(),
  }),
})

const supportTicketInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(4_000),
  category: z
    .enum([
      "general",
      "product_support",
      "order_status",
      "shipping",
      "returns_refunds",
      "account",
      "wholesale",
      "other",
    ])
    .default("general"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  orderReference: z.string().trim().max(80).optional(),
  productHandle: z.string().trim().max(160).optional(),
  aiSummary: z.string().trim().min(1).max(1_000).optional(),
}).strict()

function getConfig() {
  const provider = process.env.AI_PROVIDER || "deepseek"
  const apiKey = process.env.DEEPSEEK_API_KEY
  const baseURL = process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL
  const model = process.env.AI_MODEL || DEFAULT_AI_MODEL
  const temperature = getAssistantTemperature(
    process.env.AI_ASSISTANT_TEMPERATURE,
  )
  const internalToken = process.env.INTERNAL_API_TOKEN
  const backendUrl = resolveMedusaBaseUrl({ isServer: true })
  const releaseSha = getReleaseSha()

  if (
    provider !== "deepseek" ||
    !apiKey ||
    !internalToken ||
    !backendUrl ||
    temperature === null
  ) {
    return null
  }

  return {
    apiKey,
    backendUrl,
    baseURL,
    internalToken,
    model,
    releaseSha,
    temperature,
  }
}

function getAssistantTemperature(value: string | undefined) {
  if (value === undefined) {
    return DEFAULT_AI_ASSISTANT_TEMPERATURE
  }

  if (!value.trim()) {
    return null
  }

  const temperature = Number(value)

  return Number.isFinite(temperature) && temperature >= 0 && temperature <= 2
    ? temperature
    : null
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

type DeepSeekUsage = {
  completionTokens?: number
  promptCacheHitTokens?: number
  promptCacheMissTokens?: number
  promptTokens?: number
  totalTokens?: number
}

type UsageSnapshot = {
  cachedInputTokens?: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

function getOptionalNumber(record: Record<string, unknown>, key: string) {
  const value = record[key]

  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function normalizeDeepSeekUsage(usage: unknown): DeepSeekUsage | null {
  if (!isJsonRecord(usage)) {
    return null
  }

  return {
    completionTokens: getOptionalNumber(usage, "completion_tokens"),
    promptCacheHitTokens: getOptionalNumber(usage, "prompt_cache_hit_tokens"),
    promptCacheMissTokens: getOptionalNumber(usage, "prompt_cache_miss_tokens"),
    promptTokens: getOptionalNumber(usage, "prompt_tokens"),
    totalTokens: getOptionalNumber(usage, "total_tokens"),
  }
}

function captureDeepSeekUsageFromSseLine(
  line: string,
  usageRef: { current: DeepSeekUsage | null },
) {
  const trimmed = line.trim()

  if (!trimmed.startsWith("data:")) {
    return
  }

  const payload = trimmed.slice("data:".length).trim()

  if (!payload || payload === "[DONE]") {
    return
  }

  try {
    const parsed: unknown = JSON.parse(payload)
    const usage = isJsonRecord(parsed)
      ? normalizeDeepSeekUsage(parsed.usage)
      : null

    if (usage) {
      usageRef.current = usage
    }
  } catch {
    // SSE chunks are best-effort observability data; never break the model stream.
  }
}

function createDeepSeekUsageTransform(usageRef: {
  current: DeepSeekUsage | null
}) {
  const decoder = new TextDecoder()
  let bufferedText = ""

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bufferedText += decoder.decode(chunk, { stream: true })
      const lines = bufferedText.split(/\r?\n/)
      bufferedText = lines.pop() ?? ""

      for (const line of lines) {
        captureDeepSeekUsageFromSseLine(line, usageRef)
      }

      controller.enqueue(chunk)
    },
    flush() {
      bufferedText += decoder.decode()

      if (bufferedText) {
        for (const line of bufferedText.split(/\r?\n/)) {
          captureDeepSeekUsageFromSseLine(line, usageRef)
        }
      }
    },
  })
}

function withDeepSeekUsageCapture(
  response: Response,
  usageRef: { current: DeepSeekUsage | null },
) {
  if (typeof response.headers?.get !== "function") {
    return response
  }

  const contentType = response.headers.get("content-type") ?? ""

  if (!response.body || !contentType.includes("text/event-stream")) {
    return response
  }

  return new Response(
    response.body.pipeThrough(createDeepSeekUsageTransform(usageRef)),
    {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    },
  )
}

function toDeepSeekNonThinkingBody(
  body: globalThis.BodyInit | null | undefined,
) {
  if (typeof body !== "string") {
    return body
  }

  try {
    const parsedBody: unknown = JSON.parse(body)

    if (
      !isJsonRecord(parsedBody) ||
      typeof parsedBody.model !== "string" ||
      !parsedBody.model.startsWith("deepseek-") ||
      !Array.isArray(parsedBody.messages)
    ) {
      return body
    }

    return JSON.stringify({
      ...parsedBody,
      stream_options: {
        ...(isJsonRecord(parsedBody.stream_options)
          ? parsedBody.stream_options
          : {}),
        include_usage: true,
      },
      thinking: DEEPSEEK_NON_THINKING_MODE,
    })
  } catch {
    return body
  }
}

function createDeepSeekFetch(
  fetchImpl: typeof fetch = fetch,
  usageRef: { current: DeepSeekUsage | null } = { current: null },
): typeof fetch {
  return async (input, init) => {
    if (!init) {
      return fetchImpl(input, init)
    }

    const response = await fetchImpl(input, {
      ...init,
      body: toDeepSeekNonThinkingBody(init.body),
    })

    return withDeepSeekUsageCapture(response, usageRef)
  }
}

type AssistantTraceContext = z.infer<
  typeof assistantRequestSchema
>["traceContext"]

function getTraceContextValue(
  traceContext: AssistantTraceContext,
  key: keyof NonNullable<AssistantTraceContext>,
  fallback: string,
) {
  const value = traceContext?.[key]

  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function buildAssistantTraceMetadata(
  config: NonNullable<ReturnType<typeof getConfig>>,
  traceContext: AssistantTraceContext,
) {
  return {
    chatbot_id: getTraceContextValue(
      traceContext,
      "chatbotId",
      ASSISTANT_CHATBOT_ID,
    ),
    chatbot_surface: getTraceContextValue(
      traceContext,
      "surface",
      ASSISTANT_SURFACE,
    ),
    model: config.model,
    provider: "deepseek",
    release_sha: config.releaseSha,
    route: "/api/ai-shopping-assistant",
    service: "storefront-v3",
    temperature: config.temperature,
  }
}

function buildAssistantTelemetryMetadata(
  config: NonNullable<ReturnType<typeof getConfig>>,
  traceContext: AssistantTraceContext,
) {
  return {
    ...buildAssistantTraceMetadata(config, traceContext),
    ...(traceContext?.sessionId ? { sessionId: traceContext.sessionId } : {}),
    tags: ASSISTANT_TRACE_TAGS,
    ...(traceContext?.userId ? { userId: traceContext.userId } : {}),
  }
}

function sanitizeTraceText(text: string) {
  return maskCompleteEmailAddresses(text)
    .replace(TRACE_REFERENCE_PATTERN, "[reference]")
    .replace(TRACE_COMMERCE_ID_PATTERN, "[id]")
}

function getLatestUserMessage(messages: AssistantMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]

    if (message.role === "user") {
      return getAssistantMessageContent(message)
    }
  }

  return ""
}

function getFinishUsage(finish: unknown): UsageSnapshot {
  if (!isJsonRecord(finish) || !isJsonRecord(finish.usage)) {
    return {}
  }

  return finish.usage as UsageSnapshot
}

function getFinishReason(finish: unknown) {
  if (!isJsonRecord(finish)) {
    return "unknown"
  }

  return typeof finish.finishReason === "string" && finish.finishReason.trim()
    ? finish.finishReason.trim()
    : "unknown"
}

function getAssistantStreamError(errorOrEvent: unknown) {
  const error =
    isJsonRecord(errorOrEvent) && "error" in errorOrEvent
      ? errorOrEvent.error
      : errorOrEvent

  return error instanceof Error
    ? sanitizeTraceText(error.message)
    : "Assistant stream failed"
}

function toFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function buildDeepSeekUsageDetails(
  usage: UsageSnapshot,
  deepSeekUsage: DeepSeekUsage | null,
) {
  const inputTokens =
    toFiniteNumber(deepSeekUsage?.promptTokens) ??
    toFiniteNumber(usage.inputTokens) ??
    0
  const cacheHitTokens =
    toFiniteNumber(deepSeekUsage?.promptCacheHitTokens) ??
    toFiniteNumber(usage.cachedInputTokens) ??
    0
  const cacheMissTokens =
    toFiniteNumber(deepSeekUsage?.promptCacheMissTokens) ??
    Math.max(inputTokens - cacheHitTokens, 0)
  const outputTokens =
    toFiniteNumber(deepSeekUsage?.completionTokens) ??
    toFiniteNumber(usage.outputTokens) ??
    0
  const totalTokens =
    toFiniteNumber(deepSeekUsage?.totalTokens) ??
    toFiniteNumber(usage.totalTokens) ??
    cacheHitTokens + cacheMissTokens + outputTokens

  return {
    input_cache_hit_tokens: cacheHitTokens,
    input_cache_miss_tokens: cacheMissTokens,
    output: outputTokens,
    total: totalTokens,
  }
}

function getCacheHitRatio(
  usageDetails: ReturnType<typeof buildDeepSeekUsageDetails>,
) {
  const inputTotal =
    usageDetails.input_cache_hit_tokens + usageDetails.input_cache_miss_tokens

  if (inputTotal <= 0) {
    return 0
  }

  return Number((usageDetails.input_cache_hit_tokens / inputTotal).toFixed(4))
}

async function callInternalBackend<T>(
  path: string,
  body: unknown,
  config: NonNullable<ReturnType<typeof getConfig>>,
): Promise<T> {
  const response = await fetch(`${config.backendUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-3db-internal-token": config.internalToken,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return {
      error: "The store assistant could not verify that request right now.",
    } as T
  }

  return response.json() as Promise<T>
}

function toSupportTicketPayload(
  input: z.infer<typeof supportTicketInputSchema>,
) {
  return {
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
    category: input.category,
    priority: input.priority,
    order_reference: input.orderReference || null,
    product_handle: input.productHandle || null,
    ai_summary: input.aiSummary || null,
  }
}

function getDiagnosticMetadataValue(
  metadata: Record<string, unknown>,
  key: string,
) {
  const value = metadata[key]

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return "unknown"
}

function withEvalDiagnosticHeaders({
  config,
  promptMetadata,
  response,
  traceId,
}: {
  config: NonNullable<ReturnType<typeof getConfig>>
  promptMetadata: Record<string, unknown>
  response: Response
  traceId?: string
}) {
  const headers = new Headers(response.headers)

  if (traceId) {
    headers.set(LANGFUSE_TRACE_ID_HEADER, traceId)
  }

  headers.set(AI_MODEL_HEADER, config.model)
  headers.set(AI_TEMPERATURE_HEADER, String(config.temperature))
  headers.set(
    AI_PROMPT_VERSION_HEADER,
    getDiagnosticMetadataValue(promptMetadata, "langfuse_prompt_version"),
  )
  headers.set(
    AI_GUARDRAILS_VERSION_HEADER,
    getDiagnosticMetadataValue(promptMetadata, "code_guardrails_version"),
  )
  headers.set(RELEASE_SHA_HEADER, config.releaseSha)

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}

function shouldExposeLangfuseTraceHeader(req: Request) {
  return req.headers.get(CUSTOMER_EVAL_TRACE_ID_REQUEST_HEADER) === "1"
}

export async function POST(req: Request): Promise<Response> {
  if (process.env.AI_ASSISTANT_LOCAL_KNOWLEDGE === "1") {
    const { handleLocalKnowledgeChat } = await import("./local-knowledge-chat")
    return handleLocalKnowledgeChat(req)
  }

  const ip = getClientIp(req.headers)
  const rate = await checkRateLimit(`ai-shopping-assistant:${ip}`, 12, 60_000)

  if (!rate.allowed) {
    return Response.json(
      { error: "Too many assistant requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rate.retryAfterMs / 1000).toString(),
        },
      },
    )
  }

  const parsed = assistantRequestSchema.safeParse(
    await readAssistantJson(req),
  )

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid assistant request" },
      { status: 400 },
    )
  }

  const config = getConfig()

  if (!config) {
    return Response.json(
      { error: "Assistant configuration is incomplete" },
      { status: 503 },
    )
  }

  const supportSession = getSupportSession(req, true)!
  const assistantPrompt = await resolveAssistantSystemPrompt()
  const traceMetadata = {
    ...assistantPrompt.metadata,
    ...buildAssistantTraceMetadata(config, parsed.data.traceContext),
    message_count: parsed.data.messages.length,
  }
  const telemetryMetadata = {
    ...assistantPrompt.metadata,
    ...buildAssistantTelemetryMetadata(config, parsed.data.traceContext),
  }
  const suppliedEmails = collectEmailAddresses(
    parsed.data.messages
      .filter((message) => message.role === "user")
      .map(getAssistantMessageContent),
  )

  return startActiveLangfuseTraceObservation(
    ASSISTANT_TRACE_NAME,
    async (assistantTrace) =>
      propagateActiveLangfuseTraceAttributes(
        {
          metadata: traceMetadata,
          name: ASSISTANT_TRACE_NAME,
          sessionId: parsed.data.traceContext?.sessionId,
          tags: ASSISTANT_TRACE_TAGS,
          userId: parsed.data.traceContext?.userId,
        },
        async () => {
          let traceEnded = false
          let finishPending = false
          let visibleAssistantOutput = ""
          let visibleStreamClosed = false
          const finishAssistantTrace = (attributes: {
            level?: "DEFAULT" | "ERROR" | "WARNING"
            output: string
            statusMessage?: string
          }) => {
            if (traceEnded) {
              return
            }

            traceEnded = true
            updateActiveLangfuseTraceIO({ output: attributes.output })
            assistantTrace.update({
              ...(attributes.level ? { level: attributes.level } : {}),
              ...(attributes.statusMessage
                ? { statusMessage: attributes.statusMessage }
                : {}),
            })
            assistantTrace.end()
          }
          const finishPendingAssistantTrace = () => {
            if (!finishPending || !visibleStreamClosed) {
              return
            }

            finishPending = false
            const sanitizedOutput = sanitizeTraceText(visibleAssistantOutput)

            finishAssistantTrace({
              output: sanitizedOutput,
            })
          }
          const recordAssistantTraceError = (errorOrEvent: unknown) => {
            const errorMessage = getAssistantStreamError(errorOrEvent)

            finishAssistantTrace({
              level: "ERROR",
              output: errorMessage,
              statusMessage: errorMessage,
            })
          }
          const recordAssistantTraceAbort = () => {
            const statusMessage = "Assistant stream aborted"

            finishAssistantTrace({
              level: "WARNING",
              output: statusMessage,
              statusMessage,
            })
          }

          try {
            updateActiveLangfuseTraceIO({
              input: sanitizeTraceText(
                getLatestUserMessage(parsed.data.messages),
              ),
            })
            assistantTrace.update({
              metadata: traceMetadata,
            })

            const deepSeekUsageRef: { current: DeepSeekUsage | null } = {
              current: null,
            }
            const deepseek = createOpenAI({
              apiKey: config.apiKey,
              baseURL: config.baseURL,
              fetch: createDeepSeekFetch(fetch, deepSeekUsageRef),
              name: "deepseek",
            })
            const uiMessages = toUiMessages(parsed.data.messages)
            const latestUserMessage = getLatestUserMessage(parsed.data.messages)
            const productLookupDecision = getProductLookupDecision(latestUserMessage)
            const productSearch = createProductSearchExecution({
              backendUrl: config.backendUrl,
              internalToken: config.internalToken,
              storefrontOrigin: process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin,
              lookupAllowed: productLookupDecision.lookupAllowed,
              mode: isExplicitProductBrowse(latestUserMessage) ? "browse" : "search",
              signal: req.signal,
            })
            const knowledge = createKnowledgeExecution((input) =>
              callInternalBackend("/ai/knowledge-search", input, config),
            )
            const responseMessageId = randomUUID()
            const result = streamText({
              abortSignal: req.signal,
              model: deepseek.chat(config.model),
              system: assistantPrompt.prompt,
              messages: await convertToModelMessages(uiMessages, {
                ignoreIncompleteToolCalls: true,
              }),
              temperature: config.temperature,
              experimental_transform: createKnowledgeGroundingTransform(
                knowledge,
                suppliedEmails,
                {
                  onFlush: () => {
                    visibleStreamClosed = true
                    finishPendingAssistantTrace()
                  },
                  onText: (text) => {
                    visibleAssistantOutput += text
                  },
                },
              ),
              experimental_telemetry: {
                functionId: "storefront.ai-shopping-assistant",
                isEnabled: isAiTelemetryEnabled(),
                metadata: telemetryMetadata,
                recordInputs: false,
                recordOutputs: false,
              },
              onFinish: (finish) => {
                const usageDetails = buildDeepSeekUsageDetails(
                  getFinishUsage(finish),
                  deepSeekUsageRef.current,
                )

                updateActiveLangfuseGeneration({
                  metadata: {
                    deepseek_cache_hit_ratio: getCacheHitRatio(usageDetails),
                    finish_reason: getFinishReason(finish),
                  },
                  model: config.model,
                  usageDetails,
                })
                // Trace only the rendered output, after its stream has closed.
                // Provider prose may have been withheld by the grounding boundary.
                finishPending = true
                finishPendingAssistantTrace()
              },
              onAbort: recordAssistantTraceAbort,
              onError: recordAssistantTraceError,
              stopWhen: stepCountIs(5),
              prepareStep: ({ stepNumber }) =>
                prepareProductLinkStep(
                  latestUserMessage,
                  stepNumber,
                  productLookupDecision,
                ),
              tools: {
                searchProducts: tool({
                  description:
                    "Search published catalogue products and return current product-page links. This is discovery, not approved compatibility evidence; use searchKnowledge for verified specifications. Respect declined/empty/unavailable outcomes.",
                  inputSchema: productSearchInputSchema,
                  execute: productSearch.execute,
                }),
                searchKnowledge: tool({
                  description:
                    "Retrieve current approved Product Document facts with exact product/variant identity and source/revision citations. Use for specifications, manuals and compatibility; null facts remain unknown. Use commerce tools for current offers and inventory.",
                  inputSchema: knowledgeSearchInputSchema,
                  execute: knowledge.execute,
                }),
                lookupOrder: tool({
                  description:
                    "Look up read-only order status after the customer provides order reference and email proof.",
                  inputSchema: orderProofInputSchema,
                  execute: (input) =>
                    callInternalBackend("/ai/order-lookup", input, config),
                }),
                getTracking: tool({
                  description:
                    "Retrieve read-only tracking details after the customer provides order reference and email proof.",
                  inputSchema: orderProofInputSchema,
                  execute: (input) =>
                    callInternalBackend("/ai/tracking", input, config),
                }),
                estimateShipping: tool({
                  description:
                    "Estimate shipping from chosen variants and destination fields without changing a cart.",
                  inputSchema: shippingEstimateInputSchema,
                  execute: (input) =>
                    callInternalBackend("/ai/shipping-estimate", input, config),
                }),
                createSupportTicket: tool({
                  description:
                    "Prepare a support request for the customer to review. This never creates a ticket. The customer must use the separate review and send controls; chat messages cannot authorize submission.",
                  inputSchema: supportTicketInputSchema,
                  execute: async (input) => {
                    if (!isSupportSameOrigin(req)) return { error: "Open the store to review a support request." }
                    try {
                      const response = await callSupportBackend(req, supportSession, "prepare", {
                        ...toSupportTicketPayload(input),
                        transcript_excerpt: parsed.data.messages.map((message) =>
                          `${message.role}: ${message.content}`).join("\n").slice(-4000),
                      })
                      if (!response.ok) return { error: "Support preview is unavailable." }
                      return z.object({ status: z.literal("confirmation_required"), proposalId: z.string().regex(/^[a-f0-9]{64}$/),
                        expiresAt: z.number().int().positive() }).parse(await response.json())
                    } catch { return { error: "Support preview is unavailable." } }
                  },
                }),
              },
            })

            const response = withSupportSession(createUIMessageStreamResponse({
              stream: result.toUIMessageStream({ generateMessageId: () => responseMessageId })
                .pipeThrough(createProductActionTransform(productSearch.results, responseMessageId)),
            }), req, supportSession)

            if (!shouldExposeLangfuseTraceHeader(req)) {
              return response
            }

            return withEvalDiagnosticHeaders({
              config,
              promptMetadata: assistantPrompt.metadata,
              response,
              traceId:
                assistantTrace.traceId ||
                getActiveLangfuseTraceId() ||
                undefined,
            })
          } catch (error) {
            recordAssistantTraceError(error)
            throw error
          }
        },
      ),
  )
}
