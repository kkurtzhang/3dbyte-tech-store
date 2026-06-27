import { ReadableStream, TransformStream } from "stream/web"
import { TextDecoder } from "util"

const streamTextMock = jest.fn()
const toolMock = jest.fn((config) => config)
const createOpenAIMock = jest.fn()
const getActiveLangfuseTraceIdMock = jest.fn(() => "trace_01HQA")
const propagateActiveLangfuseTraceAttributesMock = jest.fn(
  async (_attributes: unknown, fn: () => Promise<Response>) => fn(),
)
const assistantTraceEndMock = jest.fn()
const assistantTraceUpdateMock = jest.fn()
const startActiveLangfuseTraceObservationMock = jest.fn(
  async (_name: string, fn: (observation: unknown) => Promise<Response>) =>
    fn({
      end: assistantTraceEndMock,
      traceId: "trace_01HQA",
      update: assistantTraceUpdateMock,
    }),
)
const updateActiveLangfuseGenerationMock = jest.fn()
const resolveAssistantSystemPromptMock = jest.fn()
const providerModelMock = jest.fn((model: string) => ({
  provider: "deepseek.responses",
  model,
}))
const providerChatModelMock = jest.fn((model: string) => ({
  provider: "deepseek.chat",
  model,
}))
const deepseekProviderMock = Object.assign(providerModelMock, {
  chat: providerChatModelMock,
})
const checkRateLimitMock: jest.Mock<
  { allowed: boolean; retryAfterMs: number },
  [string, number, number]
> = jest.fn((_key, _limit, _windowMs) => ({ allowed: true, retryAfterMs: 0 }))

jest.mock(
  "ai",
  () => ({
    convertToModelMessages: jest.fn(async (messages) => messages),
    stepCountIs: jest.fn((steps: number) => ({ steps })),
    streamText: (config: unknown) => streamTextMock(config),
    tool: (config: unknown) => toolMock(config),
  }),
  { virtual: true },
)

jest.mock(
  "@ai-sdk/openai",
  () => ({
    createOpenAI: (config: unknown) => createOpenAIMock(config),
  }),
  { virtual: true },
)

jest.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: (key: string, limit: number, windowMs: number) =>
    checkRateLimitMock(key, limit, windowMs),
}))

jest.mock("../prompt-management", () => ({
  resolveAssistantSystemPrompt: () => resolveAssistantSystemPromptMock(),
}))

jest.mock("@3dbyte-tech-store/observability", () => ({
  getActiveLangfuseTraceId: () => getActiveLangfuseTraceIdMock(),
  isAiTelemetryEnabled: () => true,
  propagateActiveLangfuseTraceAttributes: (
    attributes: unknown,
    fn: () => Promise<Response>,
  ) => propagateActiveLangfuseTraceAttributesMock(attributes, fn),
  startActiveLangfuseTraceObservation: (
    name: string,
    fn: (observation: unknown) => Promise<Response>,
  ) => startActiveLangfuseTraceObservationMock(name, fn),
  updateActiveLangfuseGeneration: (attributes: unknown) =>
    updateActiveLangfuseGenerationMock(attributes),
}))

const originalEnv = process.env
const originalResponse = global.Response
const originalTextDecoder = global.TextDecoder
const originalTransformStream = global.TransformStream
const fetchMock = jest.fn()

function createPromptResolutionMock() {
  return {
    metadata: {
      code_guardrails_version: "2026-06-24.1",
      langfuse_prompt_label: "staging",
      langfuse_prompt_name: "storefront.ai-shopping-assistant.system",
      langfuse_prompt_source: "langfuse",
      langfuse_prompt_version: 3,
    },
    prompt: [
      "Start product advice with a short recommendation.",
      "Use clear sections when useful.",
      "Ask one focused follow-up question when compatibility details are missing.",
      "Use only provided product, search, Strapi, Medusa, order, tracking, shipping, and support-ticket context.",
      "You are suggest-only for shopping.",
      "Product guidance may include expertContext and per-product expertSignals.",
      "Use print_process for material, nozzle, temperature, drying, enclosure, and build-surface advice.",
      "Use rc_model_building for 3DSets-style RC electronics, hardware, voltage, connector, battery, bearing, fastener, and printed component advice.",
      "Use compatibility_triage when a fit/compatibility answer needs missing printer, project, variant, voltage, connector, or use-case details.",
      "You may create a support ticket only after explicit customer confirmation and after collecting name, email, subject, and message.",
      "When recommending a product, use the provided productUrl as the product link. Never use image or thumbnail URLs as product links.",
      "Copy productUrl values exactly, character for character.",
    ].join(" "),
    source: "langfuse",
  }
}

class MockResponse {
  readonly body: ReadableStream<Uint8Array> | null
  readonly headers: { get: (name: string) => string | null }
  private readonly responseBody: unknown
  readonly status: number
  readonly statusText: string

  constructor(
    body?: unknown,
    init?: {
      headers?:
        | Record<string, string>
        | { get: (name: string) => string | null }
      status?: number
      statusText?: string
    },
  ) {
    this.body =
      typeof body === "string"
        ? stringToReadableStream(body)
        : body instanceof ReadableStream
          ? body
          : null
    this.headers = toHeaders(init?.headers)
    this.responseBody = body
    this.status = init?.status ?? 200
    this.statusText = init?.statusText ?? "OK"
  }

  async json() {
    return this.responseBody
  }

  async text() {
    if (typeof this.responseBody === "string") {
      return this.responseBody
    }

    if (!this.body) {
      return ""
    }

    const reader = this.body.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const read = await reader.read()

      if (read.done) {
        break
      }

      chunks.push(read.value)
    }

    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
      "utf8",
    )
  }

  static json(body: unknown, init?: { status?: number }) {
    return new MockResponse(body, init)
  }
}

class StreamingMockResponse {
  readonly body: ReadableStream<Uint8Array> | null
  readonly headers: { get: (name: string) => string | null }
  readonly status: number
  readonly statusText: string

  constructor(
    body?: ReadableStream<Uint8Array> | string | null,
    init?: {
      headers?:
        | Record<string, string>
        | { get: (name: string) => string | null }
      status?: number
      statusText?: string
    },
  ) {
    this.body =
      typeof body === "string" ? stringToReadableStream(body) : (body ?? null)
    this.headers = toHeaders(init?.headers)
    this.status = init?.status ?? 200
    this.statusText = init?.statusText ?? "OK"
  }

  async text() {
    if (!this.body) {
      return ""
    }

    const reader = this.body.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const read = await reader.read()

      if (read.done) {
        break
      }

      chunks.push(read.value)
    }

    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
      "utf8",
    )
  }
}

function stringToReadableStream(text: string) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(Buffer.from(text, "utf8"))
      controller.close()
    },
  })
}

function toHeaders(
  headers?: Record<string, string> | { get: (name: string) => string | null },
) {
  if (headers && "get" in headers) {
    return headers
  }

  const normalized = Object.fromEntries(
    Object.entries(headers ?? {}).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  )

  return {
    get: (name: string) => normalized[name.toLowerCase()] ?? null,
  }
}

function configureAiEnv() {
  process.env = {
    ...originalEnv,
    AI_PROVIDER: "deepseek",
    AI_MODEL: "deepseek-v4-flash",
    DEEPSEEK_API_KEY: "test-deepseek-key",
    DEEPSEEK_BASE_URL: "https://api.deepseek.com",
    INTERNAL_API_TOKEN: "test-internal-token",
    LANGFUSE_HOST: "http://observability.tailnet.local:3000",
    LANGFUSE_PUBLIC_KEY: "pk-lf-test",
    LANGFUSE_SECRET_KEY: "sk-lf-test",
    NEXT_PUBLIC_MEDUSA_BACKEND_URL: "http://localhost:9000",
    OTEL_EXPORTER_OTLP_ENDPOINT: "http://observability.tailnet.local:4318",
    OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
    STOREFRONT_RELEASE_SHA: "release_01HQA",
  }
}

function createJsonRequest(
  body: unknown,
  headers: Record<string, string> = {},
  signal = new AbortController().signal,
) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  )

  return {
    headers: {
      get: (name: string) =>
        normalizedHeaders[name.toLowerCase()] ??
        (name.toLowerCase() === "x-forwarded-for" ? "203.0.113.42" : null),
    },
    json: async () => body,
    signal,
  } as Request
}

describe("POST /api/ai-shopping-assistant", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    global.Response = MockResponse as unknown as typeof Response
    global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder
    global.TransformStream =
      TransformStream as unknown as typeof global.TransformStream
    global.fetch = fetchMock
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
    resolveAssistantSystemPromptMock.mockResolvedValue(
      createPromptResolutionMock(),
    )
    checkRateLimitMock.mockReturnValue({ allowed: true, retryAfterMs: 0 })
    createOpenAIMock.mockReturnValue(deepseekProviderMock)
    getActiveLangfuseTraceIdMock.mockReturnValue("trace_01HQA")
    streamTextMock.mockReturnValue({
      toUIMessageStreamResponse: jest.fn(
        () => new Response("assistant-stream", { status: 200 }),
      ),
    })
  })

  afterAll(() => {
    process.env = originalEnv
    global.Response = originalResponse
    global.TextDecoder = originalTextDecoder
    global.TransformStream = originalTransformStream
  })

  it("rejects invalid chat payloads before creating a model stream", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    const response = await POST(createJsonRequest({ messages: "not-an-array" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("Invalid assistant request")
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it("requires DeepSeek and internal backend configuration", async () => {
    configureAiEnv()
    delete process.env.DEEPSEEK_API_KEY
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        messages: [{ role: "user", content: "Which Voron kit should I buy?" }],
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toContain("Assistant configuration is incomplete")
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it.each(["", " ", "not-a-number", "Infinity", "-0.1", "2.1"])(
    "rejects invalid configured assistant temperature %p",
    async (temperature) => {
      configureAiEnv()
      process.env.AI_ASSISTANT_TEMPERATURE = temperature
      const { POST } = await import("../route")

      const response = await POST(
        createJsonRequest({
          messages: [{ role: "user", content: "Which PETG should I buy?" }],
        }),
      )
      const body = await response.json()

      expect(response.status).toBe(503)
      expect(body.error).toContain("Assistant configuration is incomplete")
      expect(streamTextMock).not.toHaveBeenCalled()
    },
  )

  it.each([
    [undefined, 0.2],
    ["0", 0],
    ["2", 2],
  ])(
    "uses assistant temperature %p as %p for model calls",
    async (configuredTemperature, expectedTemperature) => {
      configureAiEnv()

      if (configuredTemperature === undefined) {
        delete process.env.AI_ASSISTANT_TEMPERATURE
      } else {
        process.env.AI_ASSISTANT_TEMPERATURE = configuredTemperature
      }

      const { POST } = await import("../route")

      const response = await POST(
        createJsonRequest({
          messages: [{ role: "user", content: "Which PETG should I buy?" }],
        }),
      )

      expect(response.status).toBe(200)
      expect(streamTextMock.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          temperature: expectedTemperature,
        }),
      )
    },
  )

  it("rate limits expensive assistant requests before model creation", async () => {
    configureAiEnv()
    checkRateLimitMock.mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 2_000,
    })
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        messages: [{ role: "user", content: "Find compatible nozzles" }],
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toContain("Too many assistant requests")
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "ai-shopping-assistant:203.0.113.42",
      12,
      60_000,
    )
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it("accepts DefaultChatTransport text part payloads from the browser drawer", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        id: "chatcmpl-local",
        messages: [
          {
            id: "msg-local",
            role: "user",
            parts: [
              { type: "text", text: "Find a beginner Voron kit" },
              {
                type: "file",
                mediaType: "application/pdf",
                filename: "printer-settings.pdf",
                url: "data:application/pdf;base64,JVBERi0xLjQ=",
              },
              {
                type: "data-printerProfile",
                id: "profile_01",
                data: { printer: "Bambu Lab P1S", nozzleDiameterMm: 0.4 },
              },
            ],
          },
        ],
        trigger: "submit-message",
      }),
    )

    expect(response.status).toBe(200)
    const streamConfig = streamTextMock.mock.calls[0]?.[0]
    expect(streamConfig.messages).toEqual([
      {
        role: "user",
        parts: [
          { type: "text", text: "Find a beginner Voron kit" },
          {
            type: "file",
            mediaType: "application/pdf",
            filename: "printer-settings.pdf",
            url: "data:application/pdf;base64,JVBERi0xLjQ=",
          },
          {
            type: "data-printerProfile",
            id: "profile_01",
            data: { printer: "Bambu Lab P1S", nozzleDiameterMm: 0.4 },
          },
        ],
      },
    ])
  })

  it("accepts follow-up payloads when previous assistant messages include tool parts", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        messages: [
          {
            id: "msg-first-user",
            role: "user",
            parts: [
              {
                type: "text",
                text: "Which PETG should I use for outdoor parts?",
              },
            ],
          },
          {
            id: "msg-first-assistant",
            role: "assistant",
            parts: [
              { type: "step-start" },
              {
                type: "tool-searchProducts",
                toolCallId: "call_01_petg_search",
                state: "output-available",
                input: { query: "PETG outdoor parts", limit: 4 },
                output: { products: [{ handle: "ai-petg-black-175-1kg" }] },
                providerExecuted: true,
                callProviderMetadata: { deepseek: { requestId: "req_01" } },
                resultProviderMetadata: { deepseek: { resultId: "res_01" } },
                approval: {
                  id: "approval_01",
                  approved: true,
                  reason: "Customer confirmed product search.",
                },
              },
              {
                type: "text",
                text: "Use PETG for outdoor parts and avoid PLA for heat exposure.",
              },
            ],
          },
          {
            id: "msg-follow-up-user",
            role: "user",
            parts: [
              {
                type: "text",
                text: "Can I print that with a brass nozzle?",
              },
            ],
          },
        ],
        trigger: "submit-message",
      }),
    )

    expect(response.status).toBe(200)
    const streamConfig = streamTextMock.mock.calls[0]?.[0]
    expect(streamConfig.messages).toEqual([
      {
        role: "user",
        parts: [
          {
            type: "text",
            text: "Which PETG should I use for outdoor parts?",
          },
        ],
      },
      {
        role: "assistant",
        parts: [
          { type: "step-start" },
          {
            type: "tool-searchProducts",
            toolCallId: "call_01_petg_search",
            state: "output-available",
            input: { query: "PETG outdoor parts", limit: 4 },
            output: { products: [{ handle: "ai-petg-black-175-1kg" }] },
            callProviderMetadata: { deepseek: { requestId: "req_01" } },
            resultProviderMetadata: { deepseek: { resultId: "res_01" } },
            approval: {
              id: "approval_01",
              approved: true,
              reason: "Customer confirmed product search.",
            },
          },
          {
            type: "text",
            text: "Use PETG for outdoor parts and avoid PLA for heat exposure.",
          },
        ],
      },
      {
        role: "user",
        parts: [
          {
            type: "text",
            text: "Can I print that with a brass nozzle?",
          },
        ],
      },
    ])
  })

  it("preserves completed tool error metadata for follow-up prompts", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        messages: [
          {
            role: "user",
            parts: [
              {
                type: "text",
                text: "Search for PETG filament.",
              },
            ],
          },
          {
            role: "assistant",
            parts: [
              {
                type: "tool-searchProducts",
                toolCallId: "call_02_failed_search",
                state: "output-error",
                input: undefined,
                rawInput: { query: "PETG filament", limit: 6 },
                errorText: "Backend unavailable",
                providerExecuted: true,
                callProviderMetadata: { deepseek: { requestId: "req_02" } },
                resultProviderMetadata: { deepseek: { resultId: "res_02" } },
                approval: {
                  id: "approval_02",
                  approved: true,
                  reason: "Customer confirmed lookup.",
                },
              },
              {
                type: "text",
                text: "I could not verify live products yet.",
              },
            ],
          },
          {
            role: "user",
            parts: [{ type: "text", text: "Please try again." }],
          },
        ],
      }),
    )

    expect(response.status).toBe(200)
    const streamConfig = streamTextMock.mock.calls[0]?.[0]
    expect(streamConfig.messages[1].parts[0]).toEqual({
      type: "tool-searchProducts",
      toolCallId: "call_02_failed_search",
      state: "output-error",
      input: undefined,
      rawInput: { query: "PETG filament", limit: 6 },
      errorText: "Backend unavailable",
      callProviderMetadata: { deepseek: { requestId: "req_02" } },
      resultProviderMetadata: { deepseek: { resultId: "res_02" } },
      approval: {
        id: "approval_02",
        approved: true,
        reason: "Customer confirmed lookup.",
      },
    })
  })

  it("preserves denied tool approvals for follow-up prompts", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        messages: [
          {
            role: "user",
            parts: [{ type: "text", text: "Create a support ticket." }],
          },
          {
            role: "assistant",
            parts: [
              {
                type: "tool-createSupportTicket",
                toolCallId: "call_03_denied_ticket",
                state: "output-denied",
                input: {
                  confirmedByCustomer: true,
                  name: "Ava Customer",
                  email: "ava@example.com",
                  subject: "Compatibility help",
                  message: "Please check PETG compatibility.",
                },
                approval: {
                  id: "approval_03",
                  approved: false,
                  reason: "Customer did not consent to ticket creation.",
                },
                callProviderMetadata: { deepseek: { requestId: "req_03" } },
              },
              {
                type: "text",
                text: "I will not create a ticket without confirmation.",
              },
            ],
          },
          {
            role: "user",
            parts: [{ type: "text", text: "What should I do instead?" }],
          },
        ],
      }),
    )

    expect(response.status).toBe(200)
    const streamConfig = streamTextMock.mock.calls[0]?.[0]
    expect(streamConfig.messages[1].parts[0]).toEqual({
      type: "tool-createSupportTicket",
      toolCallId: "call_03_denied_ticket",
      state: "output-denied",
      input: {
        confirmedByCustomer: true,
        name: "Ava Customer",
        email: "ava@example.com",
        subject: "Compatibility help",
        message: "Please check PETG compatibility.",
      },
      approval: {
        id: "approval_03",
        approved: false,
        reason: "Customer did not consent to ticket creation.",
      },
      callProviderMetadata: { deepseek: { requestId: "req_03" } },
    })
  })

  it("drops malformed tool history and raw stream chunks before model conversion", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        messages: [
          {
            role: "user",
            parts: [
              {
                type: "text",
                text: "Which PETG should I use for outdoor parts?",
              },
            ],
          },
          {
            role: "assistant",
            parts: [
              { type: "step-start" },
              {
                type: "tool-searchProducts",
                state: "output-available",
                input: { query: "PETG outdoor parts", limit: 4 },
                output: { products: [{ handle: "ai-petg-black-175-1kg" }] },
              },
              {
                type: "tool-output-available",
                toolCallId: "call_01_raw_chunk",
                output: { products: [{ handle: "ai-petg-cf-black-175-1kg" }] },
              },
              {
                type: "text",
                text: "PETG is a good outdoor choice.",
              },
            ],
          },
          {
            role: "user",
            parts: [
              {
                type: "text",
                text: "Can I print that with a brass nozzle?",
              },
            ],
          },
        ],
      }),
    )

    expect(response.status).toBe(200)
    const streamConfig = streamTextMock.mock.calls[0]?.[0]
    expect(streamConfig.messages).toEqual([
      {
        role: "user",
        parts: [
          {
            type: "text",
            text: "Which PETG should I use for outdoor parts?",
          },
        ],
      },
      {
        role: "assistant",
        parts: [
          { type: "step-start" },
          {
            type: "text",
            text: "PETG is a good outdoor choice.",
          },
        ],
      },
      {
        role: "user",
        parts: [
          {
            type: "text",
            text: "Can I print that with a brass nozzle?",
          },
        ],
      },
    ])
  })

  it("rejects oversized tool part payloads before model creation", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        messages: [
          {
            role: "user",
            parts: [{ type: "text", text: "Can we continue?" }],
          },
          {
            role: "assistant",
            parts: [
              {
                type: "tool-searchProducts",
                state: "output-available",
                output: { products: "x".repeat(30_000) },
              },
            ],
          },
        ],
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("Invalid assistant request")
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it("streams with DeepSeek and exposes support ticket handoff only as confirmed user action", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        traceContext: {
          sessionId: "assistant-session_01",
          chatbotId: "storefront.shopping-assistant",
          surface: "storefront-floating-drawer",
        },
        messages: [{ role: "user", content: "Find a beginner Voron kit" }],
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("x-3db-langfuse-trace-id")).toBeNull()
    expect(startActiveLangfuseTraceObservationMock).toHaveBeenCalledWith(
      "storefront.ai-shopping-assistant",
      expect.any(Function),
    )
    expect(propagateActiveLangfuseTraceAttributesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          chatbot_id: "storefront.shopping-assistant",
          chatbot_surface: "storefront-floating-drawer",
          code_guardrails_version: "2026-06-24.1",
          langfuse_prompt_name: "storefront.ai-shopping-assistant.system",
          provider: "deepseek",
          release_sha: "release_01HQA",
          temperature: 0.2,
        }),
        name: "storefront.ai-shopping-assistant",
        sessionId: "assistant-session_01",
        tags: [
          "ai-chatbot",
          "storefront",
          "shopping-assistant",
          "storefront.shopping-assistant",
        ],
      }),
      expect.any(Function),
    )
    expect(createOpenAIMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test-deepseek-key",
        baseURL: "https://api.deepseek.com",
        fetch: expect.any(Function),
        name: "deepseek",
      }),
    )
    expect(providerChatModelMock).toHaveBeenCalledWith("deepseek-v4-flash")
    expect(providerModelMock).not.toHaveBeenCalled()
    expect(resolveAssistantSystemPromptMock).toHaveBeenCalledTimes(1)

    const streamConfig = streamTextMock.mock.calls[0]?.[0]
    expect(streamConfig.model).toEqual({
      provider: "deepseek.chat",
      model: "deepseek-v4-flash",
    })
    expect(streamConfig.experimental_telemetry).toEqual({
      functionId: "storefront.ai-shopping-assistant",
      isEnabled: true,
      metadata: {
        chatbot_id: "storefront.shopping-assistant",
        chatbot_surface: "storefront-floating-drawer",
        code_guardrails_version: "2026-06-24.1",
        model: "deepseek-v4-flash",
        provider: "deepseek",
        release_sha: "release_01HQA",
        temperature: 0.2,
        langfuse_prompt_label: "staging",
        langfuse_prompt_name: "storefront.ai-shopping-assistant.system",
        langfuse_prompt_source: "langfuse",
        langfuse_prompt_version: 3,
        route: "/api/ai-shopping-assistant",
        service: "storefront-v3",
        sessionId: "assistant-session_01",
        tags: [
          "ai-chatbot",
          "storefront",
          "shopping-assistant",
          "storefront.shopping-assistant",
        ],
      },
    })
    expect(assistantTraceUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: "Find a beginner Voron kit",
        metadata: expect.objectContaining({
          chatbot_id: "storefront.shopping-assistant",
          chatbot_surface: "storefront-floating-drawer",
          code_guardrails_version: "2026-06-24.1",
          model: "deepseek-v4-flash",
          provider: "deepseek",
          langfuse_prompt_label: "staging",
          langfuse_prompt_name: "storefront.ai-shopping-assistant.system",
          langfuse_prompt_source: "langfuse",
          langfuse_prompt_version: 3,
          message_count: 1,
          release_sha: "release_01HQA",
          service: "storefront-v3",
          temperature: 0.2,
        }),
      }),
    )
    expect(streamConfig.system).toContain("suggest-only")
    expect(streamConfig.system).toContain("explicit customer confirmation")
    expect(streamConfig.system).toContain("productUrl")
    expect(streamConfig.system).toContain("expertContext")
    expect(streamConfig.system).toContain("expertSignals")
    expect(streamConfig.system).toContain("print_process")
    expect(streamConfig.system).toContain("rc_model_building")
    expect(streamConfig.system).toContain("compatibility_triage")
    expect(streamConfig.system).toContain(
      "Start product advice with a short recommendation",
    )
    expect(streamConfig.system).toContain("Use clear sections")
    expect(streamConfig.system).toContain("Ask one focused follow-up question")
    expect(streamConfig.system).toContain(
      "Never use image or thumbnail URLs as product links",
    )
    expect(streamConfig.system).toContain(
      "Copy productUrl values exactly, character for character",
    )
    expect(Object.keys(streamConfig.tools)).toEqual([
      "searchProducts",
      "lookupOrder",
      "getTracking",
      "estimateShipping",
      "createSupportTicket",
    ])
    expect(streamConfig.tools.addToCart).toBeUndefined()

    await streamConfig.tools.createSupportTicket.execute({
      confirmedByCustomer: true,
      name: "Ava Customer",
      email: "ava@example.com",
      subject: "Compatibility help",
      category: "product_support",
      message: "Please have a human check this compatibility question.",
      aiSummary: "Customer asked whether a hotend fits a Voron build.",
      transcriptExcerpt: "Customer: will this fit?",
      consentToIncludeTranscript: true,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:9000/ai/support-ticket",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-3db-internal-token": "test-internal-token",
        }),
        body: expect.stringContaining('"source":"ai_chat"'),
      }),
    )
  })

  it("rejects malformed trace context before model creation", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        traceContext: {
          sessionId: "../not-a-safe-session-id",
        },
        messages: [{ role: "user", content: "Find PETG for outdoors" }],
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("Invalid assistant request")
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it("defaults to V4 Flash and disables DeepSeek thinking mode for tool loops", async () => {
    configureAiEnv()
    delete process.env.AI_MODEL
    delete process.env.DEEPSEEK_BASE_URL
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        messages: [{ role: "user", content: "Create a support ticket" }],
      }),
    )

    expect(response.status).toBe(200)
    expect(providerChatModelMock).toHaveBeenCalledWith("deepseek-v4-flash")

    const providerConfig = createOpenAIMock.mock.calls[0]?.[0]
    expect(providerConfig).toEqual(
      expect.objectContaining({
        apiKey: "test-deepseek-key",
        baseURL: "https://api.deepseek.com",
        fetch: expect.any(Function),
        name: "deepseek",
      }),
    )

    await providerConfig.fetch("https://api.deepseek.com/chat/completions", {
      body: JSON.stringify({
        messages: [{ role: "user", content: "Create a support ticket" }],
        model: "deepseek-v4-flash",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })

    const forwardedInit = fetchMock.mock.calls[0]?.[1]
    const forwardedBody = JSON.parse(forwardedInit.body)

    expect(forwardedBody).toEqual(
      expect.objectContaining({
        model: "deepseek-v4-flash",
        stream_options: { include_usage: true },
        thinking: { type: "disabled" },
      }),
    )
  })

  it("records DeepSeek cache-aware Langfuse usage details when streaming finishes", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    await POST(
      createJsonRequest({
        traceContext: { sessionId: "assistant-session_02" },
        messages: [{ role: "user", content: "Which PETG should I buy?" }],
      }),
    )

    const streamConfig = streamTextMock.mock.calls[0]?.[0]

    streamConfig.onFinish({
      usage: {
        cachedInputTokens: 120,
        inputTokens: 320,
        outputTokens: 80,
        totalTokens: 400,
      },
    })

    expect(updateActiveLangfuseGenerationMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          deepseek_cache_hit_ratio: 0.375,
          finish_reason: "unknown",
        }),
        model: "deepseek-v4-flash",
        usageDetails: {
          input_cache_hit_tokens: 120,
          input_cache_miss_tokens: 200,
          output: 80,
          total: 400,
        },
      }),
    )
    expect(assistantTraceEndMock).toHaveBeenCalledTimes(1)
  })

  it("records pure sanitized text as the Langfuse trace input and output", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    await POST(
      createJsonRequest({
        traceContext: { sessionId: "assistant-session_04" },
        messages: [
          {
            role: "user",
            content:
              "Can you check order RMA-2026-000123 for ava.customer@example.com and suggest PETG?",
          },
        ],
      }),
    )

    expect(assistantTraceUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input:
          "Can you check order [reference] for [email] and suggest PETG?",
        metadata: expect.objectContaining({
          message_count: 1,
        }),
      }),
    )

    const streamConfig = streamTextMock.mock.calls[0]?.[0]

    streamConfig.onFinish({
      finishReason: "stop",
      text: "Use PETG, and I found ava.customer@example.com in the request.",
      usage: {
        inputTokens: 100,
        outputTokens: 40,
        totalTokens: 140,
      },
    })

    expect(assistantTraceUpdateMock).toHaveBeenLastCalledWith({
      output: "Use PETG, and I found [email] in the request.",
    })
    expect(updateActiveLangfuseGenerationMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        metadata: {
          deepseek_cache_hit_ratio: 0,
          finish_reason: "stop",
        },
      }),
    )
    expect(assistantTraceEndMock).toHaveBeenCalledTimes(1)
  })

  it("keeps full sanitized trace output without truncation", async () => {
    configureAiEnv()
    const { POST } = await import("../route")
    const longInput = `Recommend PETG for this project. ${"y".repeat(1_500)}`
    const longOutput = `Use PETG for the enclosure. ${"x".repeat(1_500)}`

    await POST(
      createJsonRequest({
        messages: [{ role: "user", content: longInput }],
      }),
    )

    expect(assistantTraceUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ input: longInput }),
    )

    const streamConfig = streamTextMock.mock.calls[0]?.[0]
    streamConfig.onFinish({
      finishReason: "stop",
      text: longOutput,
      usage: {},
    })

    expect(assistantTraceUpdateMock).toHaveBeenLastCalledWith({
      output: longOutput,
    })
    expect(longOutput).not.toContain("...[truncated]")
  })

  it("records sanitized provider errors and ends the trace once", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    await POST(
      createJsonRequest({
        messages: [{ role: "user", content: "Which PETG should I buy?" }],
      }),
    )

    const streamConfig = streamTextMock.mock.calls[0]?.[0]
    streamConfig.onError({
      error: new Error(
        "Provider failed for ORDER-123 and ava.customer@example.com",
      ),
    })
    streamConfig.onAbort({ steps: [] })

    expect(assistantTraceUpdateMock).toHaveBeenLastCalledWith({
      level: "ERROR",
      output: "Provider failed for [reference] and [email]",
      statusMessage: "Provider failed for [reference] and [email]",
    })
    expect(assistantTraceEndMock).toHaveBeenCalledTimes(1)
  })

  it("passes the request signal and closes aborted streams with warning status", async () => {
    configureAiEnv()
    const abortController = new AbortController()
    const { POST } = await import("../route")

    await POST(
      createJsonRequest(
        {
          messages: [{ role: "user", content: "Which PETG should I buy?" }],
        },
        {},
        abortController.signal,
      ),
    )

    const streamConfig = streamTextMock.mock.calls[0]?.[0]
    expect(streamConfig.abortSignal).toBe(abortController.signal)

    streamConfig.onAbort({ steps: [] })
    streamConfig.onAbort({ steps: [] })

    expect(assistantTraceUpdateMock).toHaveBeenLastCalledWith({
      level: "WARNING",
      output: "Assistant stream aborted",
      statusMessage: "Assistant stream aborted",
    })
    expect(assistantTraceEndMock).toHaveBeenCalledTimes(1)
  })

  it("redacts email addresses from visible streamed text deltas", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    await POST(
      createJsonRequest({
        messages: [
          {
            role: "user",
            content:
              "My order is ORDER-999 and my email is ava.customer@example.com.",
          },
        ],
      }),
    )

    const streamConfig = streamTextMock.mock.calls[0]?.[0] as
      | {
          experimental_transform?: (options: {
            stopStream: () => void
            tools: Record<string, unknown>
          }) => TransformStream<
            { text: string; type: "text-delta" } | { type: "finish" },
            { text: string; type: "text-delta" } | { type: "finish" }
          >
        }
      | undefined
    const transform = streamConfig?.experimental_transform?.({
      stopStream: jest.fn(),
      tools: {},
    })

    expect(transform).toBeDefined()

    const writer = transform!.writable.getWriter()
    const reader = transform!.readable.getReader()
    const outputPromise = (async () => {
      const output: string[] = []
      let read = await reader.read()

      while (!read.done) {
        if (read.value.type === "text-delta") {
          output.push(read.value.text)
        }

        read = await reader.read()
      }

      return output.join("")
    })()

    await writer.write({
      text: "Tracking lookup failed for ava.customer@",
      type: "text-delta",
    })
    await writer.write({
      toolCallId: "call_01",
      toolName: "searchProducts",
      type: "tool-input-start",
    })
    await writer.write({
      text: "example.com.",
      type: "text-delta",
    })
    await writer.close()

    await expect(outputPromise).resolves.toBe(
      "Tracking lookup failed for [email].",
    )
  })

  it("exposes the active Langfuse trace id for eval score attachment", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest(
        {
          traceContext: { sessionId: "assistant-session_05" },
          messages: [{ role: "user", content: "Which PETG should I buy?" }],
        },
        { "x-3db-customer-ai-eval-run": "1" },
      ),
    )

    expect(response.headers.get("x-3db-langfuse-trace-id")).toBe("trace_01HQA")
    expect(response.headers.get("x-3db-ai-model")).toBe("deepseek-v4-flash")
    expect(response.headers.get("x-3db-ai-temperature")).toBe("0.2")
    expect(response.headers.get("x-3db-ai-prompt-version")).toBe("3")
    expect(response.headers.get("x-3db-ai-guardrails-version")).toBe(
      "2026-06-24.1",
    )
    expect(response.headers.get("x-3db-release-sha")).toBe("release_01HQA")
  })

  it("does not expose eval diagnostics to normal browser requests", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        messages: [{ role: "user", content: "Which PETG should I buy?" }],
      }),
    )

    expect(response.headers.get("x-3db-langfuse-trace-id")).toBeNull()
    expect(response.headers.get("x-3db-ai-model")).toBeNull()
    expect(response.headers.get("x-3db-ai-temperature")).toBeNull()
    expect(response.headers.get("x-3db-ai-prompt-version")).toBeNull()
    expect(response.headers.get("x-3db-ai-guardrails-version")).toBeNull()
    expect(response.headers.get("x-3db-release-sha")).toBeNull()
  })

  it("uses unknown diagnostic fallbacks when prompt and release metadata are unavailable", async () => {
    configureAiEnv()
    delete process.env.STOREFRONT_RELEASE_SHA
    resolveAssistantSystemPromptMock.mockResolvedValueOnce({
      metadata: {},
      prompt: "Use verified store context only.",
      source: "code",
    })
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest(
        {
          messages: [{ role: "user", content: "Which PETG should I buy?" }],
        },
        { "x-3db-customer-ai-eval-run": "1" },
      ),
    )

    expect(response.headers.get("x-3db-ai-prompt-version")).toBe("unknown")
    expect(response.headers.get("x-3db-ai-guardrails-version")).toBe("unknown")
    expect(response.headers.get("x-3db-release-sha")).toBe("unknown")
  })

  it("prefers DeepSeek provider cache usage chunks over generic AI SDK usage", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    await POST(
      createJsonRequest({
        traceContext: { sessionId: "assistant-session_03" },
        messages: [{ role: "user", content: "Which PETG should I buy?" }],
      }),
    )

    const providerConfig = createOpenAIMock.mock.calls[0]?.[0]
    const streamConfig = streamTextMock.mock.calls[0]?.[0]
    const deepSeekStream = [
      'data: {"choices":[],"usage":{"prompt_tokens":200,"prompt_cache_hit_tokens":42,"prompt_cache_miss_tokens":158,"completion_tokens":80,"total_tokens":280}}',
      "",
      "data: [DONE]",
      "",
    ].join("\n")

    global.Response = StreamingMockResponse as unknown as typeof Response
    fetchMock.mockResolvedValueOnce(
      new StreamingMockResponse(deepSeekStream, {
        headers: { "content-type": "text/event-stream" },
      }),
    )

    try {
      const response = await providerConfig.fetch(
        "https://api.deepseek.com/chat/completions",
        {
          body: JSON.stringify({
            messages: [{ role: "user", content: "Which PETG should I buy?" }],
            model: "deepseek-v4-flash",
            stream: true,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      )

      await response.text()
    } finally {
      global.Response = MockResponse as unknown as typeof Response
    }

    streamConfig.onFinish({
      usage: {
        cachedInputTokens: 999,
        inputTokens: 999,
        outputTokens: 999,
        totalTokens: 999,
      },
    })

    expect(updateActiveLangfuseGenerationMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          deepseek_cache_hit_ratio: 0.21,
          finish_reason: "unknown",
        }),
        usageDetails: {
          input_cache_hit_tokens: 42,
          input_cache_miss_tokens: 158,
          output: 80,
          total: 280,
        },
      }),
    )
  })
})
