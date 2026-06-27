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
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai"
import { z } from "zod"

import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url"
import { checkRateLimit } from "@/lib/security/rate-limit"

import { resolveAssistantSystemPrompt } from "./prompt-management"
import {
  collectEmailAddresses,
  createAssistantVisibleTextTransform,
  maskCompleteEmailAddresses,
} from "./visible-output-sanitizer"

const DEFAULT_AI_MODEL = "deepseek-v4-flash"
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
const MAX_ASSISTANT_PART_BYTES = 25_000
const TRACE_CONTEXT_ID_PATTERN = /^[a-zA-Z0-9._:-]+$/
const TRACE_REFERENCE_PATTERN =
  /\b(?:CASE|INV|ORDER|ORD|REF|RMA|SUP|TICKET|TKT)-[A-Z0-9-]+\b/gi
const TRACE_COMMERCE_ID_PATTERN =
  /\b(?:cart|claim|cus|customer|doc|ful|order|payment|pay|pi|price|prod|product|region|ship|track|variant)_[a-zA-Z0-9_:-]{6,}\b/g

const assistantPartSchema = z
  .object({
    type: z.string().trim().min(1).max(120),
    text: z.string().max(4_000).optional(),
  })
  .passthrough()
  .superRefine((part, ctx) => {
    if (part.type === "text" && !part.text?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Text part content is required",
      })
    }

    if (JSON.stringify(part).length > MAX_ASSISTANT_PART_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assistant message part is too large",
      })
    }
  })

const assistantMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000).optional(),
    parts: z.array(assistantPartSchema).min(1).max(40).optional(),
  })
  .superRefine((message, ctx) => {
    const content = getAssistantMessageContent(message)

    if (message.role === "user" && !content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "User message content is required",
      })
    }

    if (message.role === "assistant" && !content && !message.parts?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assistant message content or parts are required",
      })
    }

    if (content.length > 4_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assistant message content is too long",
      })
    }
  })

function getAssistantMessageContent(message: {
  content?: string
  parts?: Array<{ text?: string; type: string }>
}) {
  return (
    message.content ??
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("") ??
    ""
  ).trim()
}

type AssistantMessage = z.infer<typeof assistantMessageSchema>
type AssistantUiMessage = Omit<UIMessage, "id">
type AssistantPart = NonNullable<AssistantMessage["parts"]>[number]

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function hasOptionalString(value: unknown) {
  return value === undefined || typeof value === "string"
}

function isApprovalRecord(value: unknown, approved: boolean) {
  return (
    isJsonRecord(value) &&
    isNonEmptyString(value.id) &&
    value.approved === approved &&
    hasOptionalString(value.reason)
  )
}

function hasOptionalApprovedApproval(part: AssistantPart) {
  return (
    !("approval" in part) ||
    part.approval === undefined ||
    isApprovalRecord(part.approval, true)
  )
}

function isSafeFilePart(part: AssistantPart) {
  return (
    part.type === "file" &&
    isNonEmptyString(part.mediaType) &&
    isNonEmptyString(part.url) &&
    hasOptionalString(part.filename)
  )
}

function isSafeDataPart(part: AssistantPart) {
  return part.type.startsWith("data-") && "data" in part
}

function toModelToolHistoryPart(part: AssistantPart) {
  return Object.fromEntries(
    Object.entries(part).filter(([key]) => key !== "providerExecuted"),
  ) as AssistantPart
}

function toSafeToolHistoryPart(part: AssistantPart): AssistantPart | null {
  if (!part.type.startsWith("tool-") || !isNonEmptyString(part.toolCallId)) {
    return null
  }

  if (part.state === "output-available") {
    if (
      !("input" in part) ||
      !("output" in part) ||
      !hasOptionalApprovedApproval(part)
    ) {
      return null
    }

    return toModelToolHistoryPart(part)
  }

  if (part.state === "output-error") {
    if (!isNonEmptyString(part.errorText) || !hasOptionalApprovedApproval(part)) {
      return null
    }

    return toModelToolHistoryPart(part)
  }

  if (part.state === "output-denied") {
    if (
      !("input" in part) ||
      !isApprovalRecord(part.approval, false)
    ) {
      return null
    }

    return toModelToolHistoryPart(part)
  }

  return null
}

function toSafeAssistantPart(part: AssistantPart): AssistantPart | null {
  if (part.type === "text" && part.text?.trim()) {
    return { ...part, text: part.text }
  }

  if (part.type === "step-start") {
    return { type: "step-start" }
  }

  if (part.type === "reasoning" && part.text?.trim()) {
    return { ...part, text: part.text }
  }

  if (isSafeFilePart(part) || isSafeDataPart(part)) {
    return { ...part }
  }

  return toSafeToolHistoryPart(part)
}

function hasUsefulPart(parts: AssistantPart[]) {
  return parts.some((part) => part.type !== "step-start")
}

function toSafeUserPart(part: AssistantPart): AssistantPart | null {
  if (part.type === "text" && part.text?.trim()) {
    return { ...part, text: part.text }
  }

  if (isSafeFilePart(part) || isSafeDataPart(part)) {
    return { ...part }
  }

  return null
}

function toUiMessage(message: AssistantMessage): AssistantUiMessage | null {
  const content = getAssistantMessageContent(message)

  if (message.role === "user") {
    const safeParts = (message.parts ?? [])
      .map(toSafeUserPart)
      .filter((part): part is AssistantPart => Boolean(part))
    const parts =
      content && !safeParts.some((part) => part.type === "text")
        ? [{ type: "text" as const, text: content }, ...safeParts]
        : safeParts
    const uiParts = (
      parts.length ? parts : [{ type: "text" as const, text: content }]
    ) as AssistantUiMessage["parts"]

    return {
      role: "user",
      parts: uiParts,
    } as AssistantUiMessage
  }

  const safeParts = (message.parts ?? [])
    .map(toSafeAssistantPart)
    .filter((part): part is AssistantPart => Boolean(part))

  const parts =
    content && !safeParts.some((part) => part.type === "text")
      ? [{ type: "text" as const, text: content }, ...safeParts]
      : safeParts

  if (!content && !hasUsefulPart(parts)) {
    return null
  }

  return {
    role: "assistant",
    parts,
  } as AssistantUiMessage
}

function toUiMessages(messages: AssistantMessage[]) {
  return messages
    .map(toUiMessage)
    .filter((message): message is AssistantUiMessage => Boolean(message))
}

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
  confirmedByCustomer: z.literal(true),
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
  customerId: z.string().trim().max(80).optional(),
  orderId: z.string().trim().max(80).optional(),
  orderReference: z.string().trim().max(80).optional(),
  productId: z.string().trim().max(80).optional(),
  productHandle: z.string().trim().max(160).optional(),
  aiSummary: z.string().trim().max(1_000).optional(),
  transcriptExcerpt: z.string().trim().max(4_000).optional(),
  consentToIncludeTranscript: z.boolean().default(false),
  verifiedOrderContext: z.record(z.unknown()).optional(),
})

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
  const releaseSha = process.env.STOREFRONT_RELEASE_SHA?.trim() || "unknown"

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

function getFinishText(finish: unknown) {
  if (!isJsonRecord(finish)) {
    return ""
  }

  return typeof finish.text === "string" ? finish.text : ""
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
    source: "ai_chat",
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
    category: input.category,
    priority: input.priority,
    customer_id: input.customerId,
    order_id: input.orderId,
    order_reference: input.orderReference,
    product_id: input.productId,
    product_handle: input.productHandle,
    ai_summary: input.aiSummary,
    transcript_excerpt: input.consentToIncludeTranscript
      ? input.transcriptExcerpt
      : undefined,
    consent_to_include_transcript: input.consentToIncludeTranscript,
    verified_order_context: input.verifiedOrderContext,
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
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const rate = checkRateLimit(`ai-shopping-assistant:${ip}`, 12, 60_000)

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
    await req.json().catch(() => null),
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
            const result = streamText({
              abortSignal: req.signal,
              model: deepseek.chat(config.model),
              system: assistantPrompt.prompt,
              messages: await convertToModelMessages(uiMessages, {
                ignoreIncompleteToolCalls: true,
              }),
              temperature: config.temperature,
              experimental_transform:
                createAssistantVisibleTextTransform(suppliedEmails),
              experimental_telemetry: {
                functionId: "storefront.ai-shopping-assistant",
                isEnabled: isAiTelemetryEnabled(),
                metadata: telemetryMetadata,
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
                finishAssistantTrace({
                  output: sanitizeTraceText(getFinishText(finish)),
                })
              },
              onAbort: recordAssistantTraceAbort,
              onError: recordAssistantTraceError,
              stopWhen: stepCountIs(5),
              tools: {
                searchProducts: tool({
                  description:
                    "Search published products and retrieve authoritative Medusa, Meilisearch, and Strapi context.",
                  inputSchema: productSearchInputSchema,
                  execute: (input) =>
                    callInternalBackend("/ai/product-guidance", input, config),
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
                    "Create a human support ticket only after the customer explicitly confirms the handoff and provides required contact fields.",
                  inputSchema: supportTicketInputSchema,
                  execute: (input) =>
                    callInternalBackend(
                      "/ai/support-ticket",
                      toSupportTicketPayload(input),
                      config,
                    ),
                }),
              },
            })

            const response = result.toUIMessageStreamResponse()

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
