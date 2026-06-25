import {
  buildCustomerAiEvalReport,
  LangfuseHttpScoreClient,
  publishVerifiedLangfuseEvalScores,
  waitForLangfuseEvalTraces,
} from "../evals/customer-eval-runner"
import type {
  LangfuseEvalScorePayload,
} from "../evals/customer-eval-runner"

type TraceAwareLangfuseClient = {
  createScore: (score: LangfuseEvalScorePayload) => Promise<unknown>
  traceExists: (traceId: string) => Promise<boolean>
}

function makeReport(traceId?: string) {
  return buildCustomerAiEvalReport(
    [
      {
        answer: "PETG is suitable for many outdoor RC parts.",
        answerChars: 46,
        durationMs: 10,
        forbiddenMatches: [],
        formatWarnings: [],
        id: "petg-outdoor",
        includeMatched: ["PETG"],
        includeMissing: [],
        passed: true,
        prompt: "Which PETG should I use outdoors?",
        status: 200,
        traceId,
      },
    ],
    "https://store.test/api/ai-shopping-assistant",
  )
}

describe("Langfuse eval trace ingestion", () => {
  it("checks trace availability through the authenticated public API", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: "Trace not found" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: "trace-ready" }),
      })
    const client = new LangfuseHttpScoreClient({
      baseUrl: "https://observe.test/api/public/",
      fetchImpl: fetchMock as unknown as typeof fetch,
      publicKey: "pk-test",
      secretKey: "sk-test",
    }) as LangfuseHttpScoreClient & TraceAwareLangfuseClient

    await expect(client.traceExists("trace-pending")).resolves.toBe(false)
    await expect(client.traceExists("trace-ready")).resolves.toBe(true)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://observe.test/api/public/traces/trace-ready?fields=core",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: expect.stringMatching(/^Basic /),
        }),
        method: "GET",
      }),
    )
  })

  it("polls until every eval trace is queryable", async () => {
    let now = 0
    const traceExists = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const sleep = jest.fn(async (delayMs: number) => {
      now += delayMs
    })

    await expect(
      waitForLangfuseEvalTraces(
        makeReport("trace-eventual"),
        { traceExists },
        {
          now: () => now,
          pollIntervalMs: 10,
          sleep,
          timeoutMs: 50,
        },
      ),
    ).resolves.toBe(1)
    expect(traceExists).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(10)
  })

  it("rejects eval reports that cannot be correlated to a trace", async () => {
    await expect(
      waitForLangfuseEvalTraces(
        makeReport(),
        { traceExists: jest.fn() },
        { timeoutMs: 10 },
      ),
    ).rejects.toThrow("did not return a Langfuse trace ID")
  })

  it("fails with an app-side observability diagnostic when traces time out", async () => {
    let now = 0

    await expect(
      waitForLangfuseEvalTraces(
        makeReport("trace-missing"),
        { traceExists: jest.fn(async () => false) },
        {
          now: () => now,
          pollIntervalMs: 10,
          sleep: async (delayMs) => {
            now += delayMs
          },
          timeoutMs: 20,
        },
      ),
    ).rejects.toThrow(
      "Check staging storefront access to Langfuse and the OTLP endpoint",
    )
  })

  it("publishes scores only after the trace is acknowledged", async () => {
    const callOrder: string[] = []
    const client: TraceAwareLangfuseClient = {
      createScore: jest.fn(async () => {
        callOrder.push("score")
        return "score-id"
      }),
      traceExists: jest.fn(async () => {
        callOrder.push("trace")
        return true
      }),
    }

    await expect(
      publishVerifiedLangfuseEvalScores(
        makeReport("trace-ready"),
        client,
        { timeoutMs: 10 },
      ),
    ).resolves.toBe(4)
    expect(callOrder[0]).toBe("trace")
    expect(callOrder.slice(1)).toEqual([
      "score",
      "score",
      "score",
      "score",
    ])
  })

  it("does not create orphan scores when trace ingestion fails", async () => {
    let now = 0
    const createScore = jest.fn(async () => "score-id")
    const client: TraceAwareLangfuseClient = {
      createScore,
      traceExists: jest.fn(async () => false),
    }

    await expect(
      publishVerifiedLangfuseEvalScores(
        makeReport("trace-never-arrived"),
        client,
        {
          now: () => now,
          pollIntervalMs: 10,
          sleep: async (delayMs) => {
            now += delayMs
          },
          timeoutMs: 20,
        },
      ),
    ).rejects.toThrow("Timed out waiting")
    expect(createScore).not.toHaveBeenCalled()
  })
})
