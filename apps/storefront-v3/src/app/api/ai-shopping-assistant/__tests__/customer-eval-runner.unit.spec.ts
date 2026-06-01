import type { CustomerAiEvalCase } from "../evals/customer-evals"
import type { CustomerAiEvalRunResult } from "../evals/customer-eval-runner"
import {
  buildCustomerAiEvalReport,
  decodeAssistantStream,
  evaluateCustomerAiCase,
  publishLangfuseEvalScores,
  scoreCustomerEvalAnswer,
} from "../evals/customer-eval-runner"

const baseEvalCase: CustomerAiEvalCase = {
  id: "petg-outdoor-rc-parts",
  customerPrompt:
    "I'm printing outdoor RC car parts. Is PETG a good choice?",
  tags: ["petg_outdoor"],
  expectedAnswer: {
    mustIncludeOneOf: ["PETG", "outdoor", "drying"],
    mustAvoid: [
      "Do not invent stock, price, discount, safety, or compatibility claims.",
      "Do not create or change orders, carts, tickets, or customer records.",
    ],
    formatHints: ["Start with a short recommendation."],
  },
}

function makeRunResult(
  overrides: Partial<CustomerAiEvalRunResult>,
): CustomerAiEvalRunResult {
  return {
    answer: "",
    answerChars: 0,
    durationMs: 1,
    forbiddenMatches: [],
    formatWarnings: [],
    id: "base-case",
    includeMatched: [],
    includeMissing: [],
    passed: false,
    prompt: "Customer prompt",
    status: 200,
    ...overrides,
  }
}

describe("customer AI eval runner", () => {
  it("decodes AI SDK SSE text deltas without duplicating chunks", () => {
    const stream = [
      'data: {"type":"text-start","id":"msg-1"}',
      'data: {"type":"text-delta","id":"msg-1","delta":"PETG "}',
      'data: {"type":"text-delta","id":"msg-1","delta":"works outside."}',
      "data: [DONE]",
    ].join("\n")

    expect(decodeAssistantStream(stream)).toBe("PETG works outside.")
  })

  it("decodes legacy text chunks used by older AI SDK streams", () => {
    expect(decodeAssistantStream('0:"PETG "\n0:"works outside."')).toBe(
      "PETG works outside.",
    )
  })

  it("scores expected answer cues and forbidden mutation language", () => {
    const result = scoreCustomerEvalAnswer(
      baseEvalCase,
      "Recommendation: PETG is a good outdoor option, but I have created a support ticket for you.",
    )

    expect(result.includeMatched).toContain("PETG")
    expect(result.forbiddenMatches).toEqual(
      expect.arrayContaining([
        expect.stringContaining("created a support ticket"),
      ]),
    )
    expect(result.passed).toBe(false)
  })

  it("runs an eval case against a mocked assistant endpoint", async () => {
    const fetchMock = jest.fn(async () => ({
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "x-3db-langfuse-trace-id"
            ? "trace_01HQA"
            : null,
      },
      ok: true,
      status: 200,
      text: async () =>
        [
          'data: {"type":"text-delta","delta":"Recommendation: PETG "}',
          'data: {"type":"text-delta","delta":"is useful for outdoor parts."}',
        ].join("\n"),
    }))

    const result = await evaluateCustomerAiCase(baseEvalCase, {
      endpointUrl: "https://store.test/api/ai-shopping-assistant",
      fetchImpl: fetchMock,
      traceContext: {
        chatbotId: "storefront.customer-ai-evals",
        sessionId: "customer-ai-eval-session",
        surface: "customer-eval-runner",
      },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://store.test/api/ai-shopping-assistant",
      expect.objectContaining({
        body: JSON.stringify({
          messages: [{ role: "user", content: baseEvalCase.customerPrompt }],
          traceContext: {
            chatbotId: "storefront.customer-ai-evals",
            sessionId: "customer-ai-eval-session",
            surface: "customer-eval-runner",
          },
        }),
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-3db-customer-ai-eval-run": "1",
        }),
        method: "POST",
      }),
    )
    expect(result.status).toBe(200)
    expect(result.answer).toContain("PETG")
    expect(result.passed).toBe(true)
    expect(result.sessionId).toBe("customer-ai-eval-session")
    expect(result.traceId).toBe("trace_01HQA")
  })

  it("builds a durable eval report summary for artifact output", () => {
    const endpointUrl =
      "https://store.staging.3dbytetech.com.au/api/ai-shopping-assistant"
    const report = buildCustomerAiEvalReport(
      [
        makeRunResult({
          formatWarnings: ["Missing focused follow-up cue"],
          id: "passing-case",
          passed: true,
        }),
        makeRunResult({
          formatWarnings: ["Missing visible recommendation cue"],
          id: "failing-case",
          passed: false,
        }),
      ],
      endpointUrl,
      "2026-05-28T00:00:00.000Z",
    )

    expect(report.summary).toEqual({
      endpointUrl,
      failed: 1,
      generatedAt: "2026-05-28T00:00:00.000Z",
      passed: 1,
      total: 2,
      warnings: 2,
    })
    expect(report.results.map((result) => result.id)).toEqual([
      "passing-case",
      "failing-case",
    ])
  })

  it("emits Langfuse-friendly deterministic score objects", () => {
    const scoredResult = makeRunResult({
      forbiddenMatches: ["created a support ticket"],
      formatWarnings: ["Missing focused follow-up cue"],
      id: "scored-case",
      includeMatched: ["PETG"],
      includeMissing: ["drying"],
      passed: false,
    })
    const report = buildCustomerAiEvalReport(
      [scoredResult],
      "https://store.test/api/ai-shopping-assistant",
      "2026-05-31T00:00:00.000Z",
      {
        promptLabel: "staging",
        promptName: "storefront.ai-shopping-assistant.system",
        runName: "staging-prompt-smoke",
      },
    )

    expect(report.summary).toEqual(
      expect.objectContaining({
        promptLabel: "staging",
        promptName: "storefront.ai-shopping-assistant.system",
        runName: "staging-prompt-smoke",
      }),
    )
    expect(report.results[0].scores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dataType: "BOOLEAN",
          name: "deterministic_pass",
          value: 0,
        }),
        expect.objectContaining({
          dataType: "NUMERIC",
          name: "grounding_cue_match",
          value: 0.5,
        }),
        expect.objectContaining({
          dataType: "NUMERIC",
          name: "format_warning_count",
          value: 1,
        }),
        expect.objectContaining({
          dataType: "NUMERIC",
          name: "forbidden_claim_count",
          value: 1,
        }),
      ]),
    )
  })

  it("publishes deterministic scores to Langfuse by eval session", async () => {
    const scoreCreateMock = jest.fn()
    const flushMock = jest.fn(async () => undefined)
    const report = buildCustomerAiEvalReport(
      [
        makeRunResult({
          id: "session-scored-case",
          includeMatched: ["PETG"],
          passed: true,
          sessionId: "customer-ai-eval-session",
          tags: ["petg_outdoor"],
          traceId: "trace_01HQA",
        }),
      ],
      "https://store.test/api/ai-shopping-assistant",
      "2026-05-31T00:00:00.000Z",
      {
        promptLabel: "staging",
        promptName: "storefront.ai-shopping-assistant.system",
        runName: "staging-prompt-smoke",
      },
    )

    const publishedCount = await publishLangfuseEvalScores(
      report,
      {
        flush: flushMock,
        score: { create: scoreCreateMock },
      },
      { environment: "staging" },
    )

    expect(publishedCount).toBe(4)
    expect(scoreCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dataType: "BOOLEAN",
        environment: "staging",
        name: "deterministic_pass",
        sessionId: "customer-ai-eval-session",
        traceId: "trace_01HQA",
        value: 1,
        metadata: expect.objectContaining({
          evalCaseId: "session-scored-case",
          generatedAt: "2026-05-31T00:00:00.000Z",
          promptLabel: "staging",
          promptName: "storefront.ai-shopping-assistant.system",
          runName: "staging-prompt-smoke",
          tags: ["petg_outdoor"],
        }),
      }),
    )
    expect(flushMock).toHaveBeenCalledTimes(1)
  })
})
