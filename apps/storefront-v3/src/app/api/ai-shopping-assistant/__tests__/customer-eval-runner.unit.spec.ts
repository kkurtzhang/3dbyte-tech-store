import type { CustomerAiEvalCase } from "../evals/customer-evals"
import type { CustomerAiEvalRunResult } from "../evals/customer-eval-runner"
import {
  buildCustomerAiEvalReport,
  decodeAssistantStream,
  evaluateCustomerAiCase,
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
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://store.test/api/ai-shopping-assistant",
      expect.objectContaining({
        body: JSON.stringify({
          messages: [{ role: "user", content: baseEvalCase.customerPrompt }],
        }),
        method: "POST",
      }),
    )
    expect(result.status).toBe(200)
    expect(result.answer).toContain("PETG")
    expect(result.passed).toBe(true)
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
})
