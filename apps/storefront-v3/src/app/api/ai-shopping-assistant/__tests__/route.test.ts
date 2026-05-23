const streamTextMock = jest.fn()
const toolMock = jest.fn((config) => config)
const createOpenAIMock = jest.fn()
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
  { virtual: true }
)

jest.mock(
  "@ai-sdk/openai",
  () => ({
    createOpenAI: (config: unknown) => createOpenAIMock(config),
  }),
  { virtual: true }
)

jest.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: (key: string, limit: number, windowMs: number) =>
    checkRateLimitMock(key, limit, windowMs),
}))

const originalEnv = process.env
const fetchMock = jest.fn()

class MockResponse {
  private readonly responseBody: unknown
  readonly status: number

  constructor(body?: unknown, init?: { status?: number }) {
    this.responseBody = body
    this.status = init?.status ?? 200
  }

  async json() {
    return this.responseBody
  }

  async text() {
    return typeof this.responseBody === "string" ? this.responseBody : ""
  }

  static json(body: unknown, init?: { status?: number }) {
    return new MockResponse(body, init)
  }
}

function configureAiEnv() {
  process.env = {
    ...originalEnv,
    AI_PROVIDER: "deepseek",
    AI_MODEL: "deepseek-chat",
    DEEPSEEK_API_KEY: "test-deepseek-key",
    DEEPSEEK_BASE_URL: "https://api.deepseek.com/v1",
    INTERNAL_API_TOKEN: "test-internal-token",
    NEXT_PUBLIC_MEDUSA_BACKEND_URL: "http://localhost:9000",
  }
}

function createJsonRequest(body: unknown) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "x-forwarded-for" ? "203.0.113.42" : null,
    },
    json: async () => body,
  } as Request
}

describe("POST /api/ai-shopping-assistant", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    global.Response = MockResponse as unknown as typeof Response
    global.fetch = fetchMock
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
    checkRateLimitMock.mockReturnValue({ allowed: true, retryAfterMs: 0 })
    createOpenAIMock.mockReturnValue(deepseekProviderMock)
    streamTextMock.mockReturnValue({
      toUIMessageStreamResponse: jest.fn(
        () => new Response("assistant-stream", { status: 200 })
      ),
    })
  })

  afterAll(() => {
    process.env = originalEnv
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
      })
    )
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toContain("Assistant configuration is incomplete")
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it("rate limits expensive assistant requests before model creation", async () => {
    configureAiEnv()
    checkRateLimitMock.mockReturnValueOnce({ allowed: false, retryAfterMs: 2_000 })
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        messages: [{ role: "user", content: "Find compatible nozzles" }],
      })
    )
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toContain("Too many assistant requests")
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "ai-shopping-assistant:203.0.113.42",
      12,
      60_000
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
            parts: [{ type: "text", text: "Find a beginner Voron kit" }],
          },
        ],
        trigger: "submit-message",
      })
    )

    expect(response.status).toBe(200)
    const streamConfig = streamTextMock.mock.calls[0]?.[0]
    expect(streamConfig.messages).toEqual([
      {
        role: "user",
        parts: [{ type: "text", text: "Find a beginner Voron kit" }],
      },
    ])
  })

  it("streams with DeepSeek and exposes support ticket handoff only as confirmed user action", async () => {
    configureAiEnv()
    const { POST } = await import("../route")

    const response = await POST(
      createJsonRequest({
        messages: [{ role: "user", content: "Find a beginner Voron kit" }],
      })
    )

    expect(response.status).toBe(200)
    expect(createOpenAIMock).toHaveBeenCalledWith({
      apiKey: "test-deepseek-key",
      baseURL: "https://api.deepseek.com/v1",
      name: "deepseek",
    })
    expect(providerChatModelMock).toHaveBeenCalledWith("deepseek-chat")
    expect(providerModelMock).not.toHaveBeenCalled()

    const streamConfig = streamTextMock.mock.calls[0]?.[0]
    expect(streamConfig.model).toEqual({
      provider: "deepseek.chat",
      model: "deepseek-chat",
    })
    expect(streamConfig.system).toContain("suggest-only")
    expect(streamConfig.system).toContain("explicit customer confirmation")
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
        body: expect.stringContaining("\"source\":\"ai_chat\""),
      })
    )
  })
})
