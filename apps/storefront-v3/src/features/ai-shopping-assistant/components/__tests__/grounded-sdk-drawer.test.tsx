import { render, screen } from "@testing-library/react"
import {
  ReadableStream,
  TransformStream,
  WritableStream,
} from "node:stream/web"
import { TextDecoder, TextEncoder } from "node:util"
import { deserialize, serialize } from "node:v8"
import observed from "@/app/api/ai-shopping-assistant/__fixtures__/observed-knowledge-answers.json"
import { createCommerceExecution } from "@/app/api/ai-shopping-assistant/commerce-execution"
import { createKnowledgeExecution } from "@/app/api/ai-shopping-assistant/knowledge-execution"
import { createKnowledgeGroundingTransform } from "@/app/api/ai-shopping-assistant/knowledge-grounding"

let mockMessages: Array<{
  id: string
  role: "assistant"
  parts: Array<Record<string, unknown>>
}> = []
jest.mock("next/navigation", () => ({ usePathname: () => "/shop" }))
jest.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: mockMessages,
    status: "ready",
    error: null,
    sendMessage: jest.fn(),
  }),
}))
jest.mock("lucide-react", () =>
  Object.fromEntries(
    [
      "Bot",
      "Send",
      "ShoppingBag",
      "Sparkles",
      "Loader2",
      "LifeBuoy",
      "Maximize2",
      "Minimize2",
      "X",
    ].map((name) => [name, () => <svg aria-hidden="true" />]),
  ),
)
const original = {
  structuredClone: global.structuredClone,
  WritableStream: global.WritableStream,
  ReadableStream: global.ReadableStream,
  TransformStream: global.TransformStream,
  TextEncoder: global.TextEncoder,
  TextDecoder: global.TextDecoder,
}
beforeAll(() => {
  Object.assign(global, {
    // jsdom lacks the browser clone API; UI message state is serializable data.
    structuredClone: (value: unknown) => deserialize(serialize(value)),
    ReadableStream,
    TransformStream,
    WritableStream,
    TextEncoder,
    TextDecoder,
  })
})
afterAll(() => {
  Object.assign(global, original)
})
afterEach(() => {
  jest.restoreAllMocks()
})

it("renders native citations from the actual SDK grounding stream as safe clickable links in the real drawer", async () => {
  const { ShoppingAssistantDrawer } = await import(
    "../shopping-assistant-drawer"
  )
  const { streamText, simulateReadableStream, readUIMessageStream } =
    await import("ai")
  const { MockLanguageModelV3 } = await import("ai/test")
  const fixture = observed.cases.find((c) => c.id === "bms-body-material")!
  const call = fixture.toolInputs.find((c) => c.toolName === "searchKnowledge")!
  const evidence = fixture.toolOutputs.find(
    (c) => c.toolCallId === call.toolCallId,
  )!.output
  const now = Date.parse(observed.provenance.observedAt)
  jest.spyOn(Date, "now").mockReturnValue(now)
  const execution = createKnowledgeExecution(
    async () => evidence,
    () => now,
  )
  await execution.execute(call.input, { toolCallId: "fresh-knowledge" })
  const commerce = createCommerceExecution(async () => ({
    order: { fulfillment_status: "shipped" },
  }))
  await commerce.execute(
    "lookupOrder",
    { reference: "SYNTHETIC-001" },
    { toolCallId: "fresh-order" },
  )
  const result = streamText({
    model: new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          initialDelayInMs: null,
          chunkDelayInMs: null,
          chunks: [
            { type: "stream-start", warnings: [] },
            {
              type: "source",
              sourceType: "url",
              id: "forged",
              url: "https://evil.example",
              title: "Invented citation",
            },
            { type: "text-start", id: "model" },
            {
              type: "text-delta",
              id: "model",
              delta: "Every printer is safe at 500 °C.",
            },
            { type: "text-end", id: "model" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: {
                inputTokens: {
                  total: 1,
                  noCache: 1,
                  cacheRead: 0,
                  cacheWrite: 0,
                },
                outputTokens: { total: 1, text: 1, reasoning: 0 },
              },
            },
          ],
        }),
      }),
    }),
    prompt: fixture.prompt,
    experimental_transform: createKnowledgeGroundingTransform(
      execution,
      [],
      {},
      { question: fixture.prompt, commerce },
    ),
  })
  for await (const message of readUIMessageStream({
    stream: result.toUIMessageStream({ sendSources: true }),
    terminateOnError: true,
  })) {
    mockMessages = [{ id: message.id, role: "assistant", parts: message.parts }]
  }
  render(<ShoppingAssistantDrawer initiallyOpen />)
  const doc = evidence.documents![0]
  const link = screen.getByRole("link", { name: (name) => name.includes(doc.document_title) })
  expect(link).toHaveTextContent("Manufacturer body-material statement")
  const sources = screen.getByRole("navigation", { name: "Evidence sources" })
  expect(sources).toBe(sources.parentElement?.lastElementChild)
  expect(screen.getByText(/shipped/).compareDocumentPosition(sources) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(link).toHaveAttribute("href", doc.source_url)
  expect(link).toHaveAttribute("target", "_blank")
  expect(link).toHaveAttribute("rel", "noopener noreferrer")
  expect(
    screen.getByRole("navigation", { name: "Evidence sources" }),
  ).toBeInTheDocument()
  expect(document.body.textContent).toContain("mainly copper")
  expect(document.body.textContent).toContain("Order lookup — SYNTHETIC-001")
  expect(screen.getByText(/shipped/)).toBeInTheDocument()
  expect(document.body.textContent).not.toContain("safe at 500")
  expect(document.body.textContent).not.toContain(`[${doc.document_title}](`)
  expect(
    screen.queryByRole("link", { name: "Invented citation" }),
  ).not.toBeInTheDocument()
})
