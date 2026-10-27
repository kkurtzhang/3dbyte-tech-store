/** @jest-environment node */
import type { MockLanguageModelV3 as Model } from "ai/test"
import observed from "../__fixtures__/observed-knowledge-answers.json"
import { POST } from "../route"

let mockModel: Model
const mockTraceOutput = jest.fn()
const mockTraceEnd = jest.fn()
jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => ({ chat: () => mockModel }),
}))
jest.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  getClientIp: () => "127.0.0.1",
}))
jest.mock("../prompt-management", () => ({
  resolveAssistantSystemPrompt: async () => ({
    prompt: "Synthetic regression; the model ignores the prompt",
    metadata: {},
  }),
}))
jest.mock("@3dbyte-tech-store/observability", () => ({
  getActiveLangfuseTraceId: () => undefined,
  isAiTelemetryEnabled: () => false,
  propagateActiveLangfuseTraceAttributes: (_: unknown, fn: () => unknown) =>
    fn(),
  startActiveLangfuseTraceObservation: (
    _: unknown,
    fn: (v: unknown) => unknown,
  ) => fn({ update: () => undefined, end: mockTraceEnd }),
  updateActiveLangfuseGeneration: () => undefined,
  updateActiveLangfuseTraceIO: (value: unknown) => mockTraceOutput(value),
}))
const originalEnv = process.env
const originalFetch = global.fetch
const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 4, text: 4, reasoning: 0 },
}
type ProviderStream = Awaited<ReturnType<Model["doStream"]>>["stream"]
type ProviderChunk = ProviderStream extends ReadableStream<infer C> ? C : never
const unsafeClaim = "500 °C is far above typical hotend operating ranges"
beforeEach(() => {
  jest.clearAllMocks()
  process.env = {
    ...originalEnv,
    AI_PROVIDER: "deepseek",
    AI_MODEL: "deepseek-flash",
    DEEPSEEK_API_KEY: "synthetic-provider",
    INTERNAL_API_TOKEN: "synthetic-internal",
    NEXT_PUBLIC_MEDUSA_BACKEND_URL: "http://127.0.0.1:9",
    NEXT_PUBLIC_SITE_URL: "https://store.example",
  }
  jest
    .spyOn(Date, "now")
    .mockReturnValue(Date.parse(observed.provenance.observedAt))
})
afterEach(() => {
  process.env = originalEnv
  global.fetch = originalFetch
  jest.restoreAllMocks()
})

it.each(observed.cases)(
  "renders only current evidence for the observed $id question despite the exact model answer",
  async (fixture) => {
    const { MockLanguageModelV3 } = await import("ai/test")
    const { simulateReadableStream } = await import("ai")
    let step = 0
    mockModel = new MockLanguageModelV3({
      doStream: async () => {
        const call = fixture.toolInputs[step++]
        const chunks: ProviderChunk[] = call
          ? [
              { type: "stream-start", warnings: [] },
              // A pre-tool assertion must not leak before the evidence boundary activates.
              { type: "text-start", id: `preface-${step}` },
              {
                type: "text-delta",
                id: `preface-${step}`,
                delta: "The requested temperature is definitely safe. ",
              },
              { type: "text-end", id: `preface-${step}` },
              {
                type: "tool-call",
                toolCallId: call.toolCallId,
                toolName: call.toolName,
                input: JSON.stringify(call.input),
              },
              {
                type: "finish",
                finishReason: { unified: "tool-calls", raw: "tool_calls" },
                usage,
              },
            ]
          : [
              { type: "stream-start", warnings: [] },
              { type: "text-start", id: "reply" },
              ...[fixture.answer.slice(0, 137), fixture.answer.slice(137)].map(
                (delta) => ({
                  type: "text-delta" as const,
                  id: "reply",
                  delta,
                }),
              ),
              { type: "text-end", id: "reply" },
              {
                type: "finish",
                finishReason: { unified: "stop", raw: "stop" },
                usage,
              },
            ]
        return {
          stream: simulateReadableStream({
            initialDelayInMs: null,
            chunkDelayInMs: null,
            chunks,
          }),
        }
      },
    })
    global.fetch = jest.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input)
        const body = JSON.parse(String(init?.body))
        const call = fixture.toolInputs.find(
          (c) => c.input.query === body.query,
        )
        const output = fixture.toolOutputs.find(
          (o) => o.toolCallId === call?.toolCallId,
        )?.output
        if (
          !output ||
          !["/ai/knowledge-search", "/ai/product-guidance"].some((p) =>
            url.endsWith(p),
          )
        )
          throw Error("Unexpected backend operation")
        return Response.json(output)
      },
    )
    const response = await POST(
      new Request("https://store.example/api/ai-shopping-assistant", {
        method: "POST",
        headers: {
          origin: "https://store.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: fixture.prompt }],
        }),
      }),
    )
    const raw = await response.text()
    const events = raw
      .split("\n")
      .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
      .map((line) => JSON.parse(line.slice(6)))
    const answer = events
      .filter((e) => e.type === "text-delta")
      .map((e) => e.delta)
      .join("")
    expect(response.status).toBe(200)
    expect(answer).not.toContain(unsafeClaim)
    expect(answer).not.toContain("definitely safe")
    expect(answer).not.toContain("limiting factor is usually")
    const knowledgeOutputs = fixture.toolInputs
      .filter((c) => c.toolName === "searchKnowledge")
      .map(
        (c) =>
          fixture.toolOutputs.find((o) => o.toolCallId === c.toolCallId)!
            .output,
      )
    for (const output of knowledgeOutputs) {
      if (!output.documents) throw Error("Expected captured knowledge evidence")
      for (const doc of output.documents) {
        expect(answer).toContain(doc.product_title)
        expect(events).toContainEqual(
          expect.objectContaining({
            type: "source-url",
            url: doc.source_url,
            title: expect.stringContaining(doc.document_title),
          }),
        )
      }
    }
    if (fixture.id === "magigoo-materials") expect(answer).toContain("PLA")
    if (fixture.id === "bms-body-material")
      expect(answer).toContain("mainly copper")
    if (fixture.id === "unsupported-installed-temperature") {
      expect(answer).toContain("Installed max temperature")
      expect(answer).toContain("unknown")
    }
    if (fixture.id === "mismatched-product-evidence") {
      expect(answer).toContain("only to the named product")
      expect(answer.indexOf("Magigoo Original")).toBeLessThan(
        answer.indexOf("Phaetus Dragonfly"),
      )
    }
    expect(events.filter((e) => e.type === "error")).toEqual([])
    // Real SDK callback ordering must trace the final visible evidence, never raw model prose.
    expect(mockTraceOutput).toHaveBeenLastCalledWith({ output: answer })
    expect(mockTraceEnd).toHaveBeenCalledTimes(1)
  },
)

it("preserves product actions and draft-only support confirmation during a knowledge turn", async () => {
  const { MockLanguageModelV3 } = await import("ai/test")
  const { simulateReadableStream } = await import("ai")
  const fixture = observed.cases.find((c) => c.id === "bms-body-material")!
  const knowledgeCall = fixture.toolInputs.find(
    (c) => c.toolName === "searchKnowledge",
  )!
  const knowledgeOutput = fixture.toolOutputs.find(
    (o) => o.toolCallId === knowledgeCall.toolCallId,
  )!.output
  const proposalId = "a".repeat(64)
  const calls = [
    { toolName: "searchProducts", input: { query: "Dragonfly BMS" } },
    { toolName: "searchKnowledge", input: knowledgeCall.input },
    {
      toolName: "createSupportTicket",
      input: {
        name: "Synthetic Customer",
        email: "synthetic@example.invalid",
        subject: "Synthetic safety question",
        message: "Please prepare a support draft.",
      },
    },
  ]
  let step = 0
  mockModel = new MockLanguageModelV3({
    doStream: async () => {
      const call = calls[step++]
      const chunks: ProviderChunk[] = call
        ? [
            { type: "stream-start", warnings: [] },
            {
              type: "tool-call",
              toolCallId: `mixed-${step}`,
              toolName: call.toolName,
              input: JSON.stringify(call.input),
            },
            {
              type: "finish",
              finishReason: { unified: "tool-calls", raw: "tool_calls" },
              usage,
            },
          ]
        : [
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "reply" },
            {
              type: "text-delta",
              id: "reply",
              delta: "This is definitely safe at 500 °C. Your ticket was sent.",
            },
            { type: "text-end", id: "reply" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage,
            },
          ]
      return {
        stream: simulateReadableStream({
          initialDelayInMs: null,
          chunkDelayInMs: null,
          chunks,
        }),
      }
    },
  })
  const fetcher = jest.fn(async (input: string | URL | Request) => {
    const url = String(input)
    if (url.endsWith("/ai/product-guidance"))
      return Response.json({
        status: "matches",
        mode: "search",
        query: "Dragonfly BMS",
        products: [
          {
            id: knowledgeOutput.documents![0].product_id,
            title: "Dragonfly BMS",
            handle: "dragonfly-bms",
            productUrl: "https://store.example/products/dragonfly-bms",
          },
        ],
      })
    if (url.endsWith("/ai/knowledge-search"))
      return Response.json(knowledgeOutput)
    if (url.endsWith("/ai/support-ticket/prepare"))
      return Response.json({
        status: "confirmation_required",
        proposalId,
        expiresAt: Date.now() + 600_000,
        receipt: "server-receipt-must-not-stream",
      })
    throw new Error("Unexpected backend operation")
  })
  global.fetch = fetcher
  const response = await POST(
    new Request("https://store.example/api/ai-shopping-assistant", {
      method: "POST",
      headers: {
        origin: "https://store.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content:
              "Show me the Dragonfly BMS product page, tell me what it's made of and help me draft a support request.",
          },
        ],
      }),
    }),
  )
  const body = await response.text()
  const events = body
    .split("\n")
    .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map((line) => JSON.parse(line.slice(6)))
  const answer = events
    .filter((e) => e.type === "text-delta")
    .map((e) => e.delta)
    .join("")
  expect(answer).toContain("mainly copper")
  expect(events).toContainEqual(
    expect.objectContaining({
      type: "source-url",
      url: "https://www.phaetus.com/products/dragonfly-hotend-bms",
    }),
  )
  expect(answer).not.toMatch(/definitely safe|ticket was sent/)
  expect(events.filter((e) => e.type === "data-product-search")).toEqual([
    expect.objectContaining({
      transient: true,
      data: expect.objectContaining({
        status: "matches",
        products: [
          expect.objectContaining({ href: "/products/dragonfly-bms" }),
        ],
      }),
    }),
  ])
  expect(events).toContainEqual(
    expect.objectContaining({
      type: "tool-output-available",
      toolCallId: "mixed-3",
      output: {
        status: "confirmation_required",
        proposalId,
        expiresAt: expect.any(Number),
      },
    }),
  )
  expect(body).not.toContain("server-receipt")
  expect(events.filter((e) => e.type === "error")).toEqual([])
  expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
    "http://127.0.0.1:9/ai/product-guidance",
    "http://127.0.0.1:9/ai/knowledge-search",
    "http://127.0.0.1:9/ai/support-ticket/prepare",
  ])
  expect(mockTraceOutput).toHaveBeenLastCalledWith({ output: answer })
  expect(mockModel.doStreamCalls).toHaveLength(4)
})
