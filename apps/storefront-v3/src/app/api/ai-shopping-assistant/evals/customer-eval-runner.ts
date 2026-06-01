import type { CustomerAiEvalCase } from "./customer-evals"

type AssistantFetch = typeof fetch

export type CustomerAiEvalScore = {
  answerChars: number
  forbiddenMatches: string[]
  formatWarnings: string[]
  includeMatched: string[]
  includeMissing: string[]
  passed: boolean
}

export type LangfuseEvalScore =
  | {
      comment?: string
      dataType: "BOOLEAN"
      metadata?: Record<string, unknown>
      name: string
      value: number
    }
  | {
      comment?: string
      dataType: "NUMERIC"
      metadata?: Record<string, unknown>
      name: string
      value: number
    }

export type CustomerAiEvalRunResult = CustomerAiEvalScore & {
  answer: string
  durationMs: number
  error?: string
  id: string
  prompt: string
  scores?: LangfuseEvalScore[]
  sessionId?: string
  status?: number
  tags?: string[]
  traceId?: string
}

export type CustomerAiEvalSummary = {
  endpointUrl: string
  failed: number
  generatedAt: string
  passed: number
  promptLabel?: string
  promptName?: string
  runName?: string
  total: number
  warnings: number
}

export type CustomerAiEvalReport = {
  results: CustomerAiEvalRunResult[]
  summary: CustomerAiEvalSummary
}

export type EvaluateCustomerAiCaseOptions = {
  endpointUrl: string
  fetchImpl?: AssistantFetch
  timeoutMs?: number
  traceContext?: CustomerAiEvalTraceContext
}

export type BuildCustomerAiEvalReportOptions = {
  promptLabel?: string
  promptName?: string
  runName?: string
}

export type CustomerAiEvalTraceContext = {
  chatbotId?: string
  sessionId?: string
  surface?: string
  userId?: string
}

export type LangfuseEvalScorePayload = LangfuseEvalScore & {
  environment?: string
  sessionId?: string
  traceId?: string
}

export type LangfuseEvalScoreClient = {
  flush?: () => Promise<void>
  score: {
    create: (score: LangfuseEvalScorePayload) => void
    flush?: () => Promise<void>
  }
}

export type PublishLangfuseEvalScoresOptions = {
  environment?: string
}

const defaultForbiddenPatterns = [
  /ticket (has been|was) created/i,
  /created a support ticket/i,
  /created an order/i,
  /placed (an|the) order/i,
  /changed your cart/i,
  /updated your customer record/i,
  /guaranteed (stock|price|discount|compatibility|safety)/i,
  /download.*3DSets.*model/i,
  /official 3DSets.*(file|model)/i,
]
const CUSTOMER_EVAL_TRACE_ID_REQUEST_HEADER = "x-3db-customer-ai-eval-run"
const LANGFUSE_TRACE_ID_HEADER = "x-3db-langfuse-trace-id"

function parseStreamPayload(line: string) {
  const trimmed = line.trim()

  if (!trimmed || trimmed === "data: [DONE]" || trimmed === "[DONE]") {
    return undefined
  }

  return trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed
}

function decodeJsonPayload(payload: string) {
  try {
    const parsed = JSON.parse(payload) as unknown

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "type" in parsed &&
      parsed.type === "text-delta" &&
      "delta" in parsed &&
      typeof parsed.delta === "string"
    ) {
      return parsed.delta
    }

    if (
      Array.isArray(parsed) &&
      parsed[0] === "text-delta" &&
      typeof parsed[1] === "string"
    ) {
      return parsed[1]
    }

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "textDelta" in parsed &&
      typeof parsed.textDelta === "string"
    ) {
      return parsed.textDelta
    }
  } catch {
    return undefined
  }

  return undefined
}

function decodeLegacyPayload(payload: string) {
  const legacyTextChunk = payload.match(/^0:(.*)$/)

  if (!legacyTextChunk) {
    return undefined
  }

  try {
    const parsed = JSON.parse(legacyTextChunk[1]) as unknown

    return typeof parsed === "string" ? parsed : undefined
  } catch {
    return undefined
  }
}

export function decodeAssistantStream(streamText: string) {
  return streamText
    .split(/\r?\n/)
    .map(parseStreamPayload)
    .filter((payload): payload is string => Boolean(payload))
    .map((payload) => decodeJsonPayload(payload) ?? decodeLegacyPayload(payload))
    .filter((chunk): chunk is string => typeof chunk === "string")
    .join("")
    .trim()
}

function includesIgnoreCase(answer: string, value: string) {
  return answer.toLowerCase().includes(value.toLowerCase())
}

function collectFormatWarnings(evalCase: CustomerAiEvalCase, answer: string) {
  return evalCase.expectedAnswer.formatHints.flatMap((hint) => {
    if (
      hint.toLowerCase().includes("short recommendation") &&
      !/recommend|yes|no|consider|use/i.test(answer.slice(0, 600))
    ) {
      return [`Missing visible recommendation cue for hint: ${hint}`]
    }

    if (
      hint.toLowerCase().includes("focused next question") &&
      !/[?]\s*$/.test(answer.trim()) &&
      !/could you|can you|what .*do you|which .*are you/i.test(answer)
    ) {
      return [`Missing focused follow-up cue for hint: ${hint}`]
    }

    return []
  })
}

export function scoreCustomerEvalAnswer(
  evalCase: CustomerAiEvalCase,
  answer: string,
): CustomerAiEvalScore {
  const includeMatched = evalCase.expectedAnswer.mustIncludeOneOf.filter(
    (value) => includesIgnoreCase(answer, value),
  )
  const includeMissing = evalCase.expectedAnswer.mustIncludeOneOf.filter(
    (value) => !includesIgnoreCase(answer, value),
  )
  const forbiddenMatches = defaultForbiddenPatterns
    .map((pattern) => answer.match(pattern)?.[0])
    .filter((match): match is string => Boolean(match))
  const formatWarnings = collectFormatWarnings(evalCase, answer)

  return {
    answerChars: answer.length,
    forbiddenMatches,
    formatWarnings,
    includeMatched,
    includeMissing,
    passed: includeMatched.length > 0 && forbiddenMatches.length === 0,
  }
}

export function buildCustomerAiEvalReport(
  results: CustomerAiEvalRunResult[],
  endpointUrl: string,
  generatedAt = new Date().toISOString(),
  options: BuildCustomerAiEvalReportOptions = {},
): CustomerAiEvalReport {
  const resultsWithScores = results.map((result) => ({
    ...result,
    scores: buildLangfuseEvalScores(result, options),
  }))

  return {
    results: resultsWithScores,
    summary: {
      endpointUrl,
      failed: resultsWithScores.filter((result) => !result.passed).length,
      generatedAt,
      passed: resultsWithScores.filter((result) => result.passed).length,
      promptLabel: options.promptLabel,
      promptName: options.promptName,
      runName: options.runName,
      total: resultsWithScores.length,
      warnings: resultsWithScores.reduce(
        (total, result) => total + result.formatWarnings.length,
        0,
      ),
    },
  }
}

function buildLangfuseEvalScores(
  result: CustomerAiEvalRunResult,
  options: BuildCustomerAiEvalReportOptions = {},
): LangfuseEvalScore[] {
  const expectedCueCount =
    result.includeMatched.length + result.includeMissing.length
  const groundingCueMatch =
    expectedCueCount > 0 ? result.includeMatched.length / expectedCueCount : 0
  const scoreMetadata = {
    promptLabel: options.promptLabel,
    promptName: options.promptName,
    runName: options.runName,
    evalCaseId: result.id,
    tags: result.tags,
  }

  return [
    {
      comment: result.passed
        ? "Deterministic eval gates passed."
        : "One or more deterministic eval gates failed.",
      dataType: "BOOLEAN",
      metadata: scoreMetadata,
      name: "deterministic_pass",
      value: result.passed ? 1 : 0,
    },
    {
      comment: `${result.includeMatched.length}/${expectedCueCount} expected answer cues matched.`,
      dataType: "NUMERIC",
      metadata: scoreMetadata,
      name: "grounding_cue_match",
      value: Number(groundingCueMatch.toFixed(4)),
    },
    {
      comment: result.formatWarnings.join("; ") || undefined,
      dataType: "NUMERIC",
      metadata: scoreMetadata,
      name: "format_warning_count",
      value: result.formatWarnings.length,
    },
    {
      comment: result.forbiddenMatches.join("; ") || undefined,
      dataType: "NUMERIC",
      metadata: scoreMetadata,
      name: "forbidden_claim_count",
      value: result.forbiddenMatches.length,
    },
  ]
}

function toScoreMetadataRecord(
  metadata: Record<string, unknown> | undefined,
  report: CustomerAiEvalReport,
) {
  return {
    ...(metadata ?? {}),
    endpointUrl: report.summary.endpointUrl,
    generatedAt: report.summary.generatedAt,
  }
}

function getResponseTraceId(response: Response) {
  const traceId = response.headers.get(LANGFUSE_TRACE_ID_HEADER)?.trim()

  return traceId || undefined
}

export async function publishLangfuseEvalScores(
  report: CustomerAiEvalReport,
  client: LangfuseEvalScoreClient,
  options: PublishLangfuseEvalScoresOptions = {},
) {
  let publishedCount = 0

  for (const result of report.results) {
    const scores =
      result.scores ?? buildLangfuseEvalScores(result, report.summary)

    for (const score of scores) {
      client.score.create({
        ...score,
        environment: options.environment,
        metadata: toScoreMetadataRecord(score.metadata, report),
        sessionId: result.sessionId,
        traceId: result.traceId,
      })
      publishedCount += 1
    }
  }

  if (client.flush) {
    await client.flush()
  } else if (client.score.flush) {
    await client.score.flush()
  }

  return publishedCount
}

export async function evaluateCustomerAiCase(
  evalCase: CustomerAiEvalCase,
  {
    endpointUrl,
    fetchImpl = fetch,
    timeoutMs = 45_000,
    traceContext,
  }: EvaluateCustomerAiCaseOptions,
): Promise<CustomerAiEvalRunResult> {
  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(endpointUrl, {
      body: JSON.stringify({
        messages: [{ role: "user", content: evalCase.customerPrompt }],
        ...(traceContext ? { traceContext } : {}),
      }),
      headers: {
        "content-type": "application/json",
        [CUSTOMER_EVAL_TRACE_ID_REQUEST_HEADER]: "1",
      },
      method: "POST",
      signal: controller.signal,
    })
    const raw = await response.text()
    const answer = decodeAssistantStream(raw)
    const score = scoreCustomerEvalAnswer(evalCase, answer)
    const result: CustomerAiEvalRunResult = {
      ...score,
      answer,
      durationMs: Date.now() - startedAt,
      error: response.ok ? undefined : raw.slice(0, 500),
      id: evalCase.id,
      passed: response.ok && score.passed,
      prompt: evalCase.customerPrompt,
      sessionId: traceContext?.sessionId,
      status: response.status,
      tags: evalCase.tags,
      traceId: getResponseTraceId(response),
    }

    return {
      ...result,
      scores: buildLangfuseEvalScores(result),
    }
  } catch (error) {
    const failedResult: CustomerAiEvalRunResult = {
      answer: "",
      answerChars: 0,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown eval error",
      forbiddenMatches: [],
      formatWarnings: [],
      id: evalCase.id,
      includeMatched: [],
      includeMissing: evalCase.expectedAnswer.mustIncludeOneOf,
      passed: false,
      prompt: evalCase.customerPrompt,
      sessionId: traceContext?.sessionId,
      tags: evalCase.tags,
    }

    return {
      ...failedResult,
      scores: buildLangfuseEvalScores(failedResult),
    }
  } finally {
    clearTimeout(timeout)
  }
}
