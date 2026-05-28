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

export type CustomerAiEvalRunResult = CustomerAiEvalScore & {
  answer: string
  durationMs: number
  error?: string
  id: string
  prompt: string
  status?: number
}

export type CustomerAiEvalSummary = {
  endpointUrl: string
  failed: number
  generatedAt: string
  passed: number
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
): CustomerAiEvalReport {
  return {
    results,
    summary: {
      endpointUrl,
      failed: results.filter((result) => !result.passed).length,
      generatedAt,
      passed: results.filter((result) => result.passed).length,
      total: results.length,
      warnings: results.reduce(
        (total, result) => total + result.formatWarnings.length,
        0,
      ),
    },
  }
}

export async function evaluateCustomerAiCase(
  evalCase: CustomerAiEvalCase,
  {
    endpointUrl,
    fetchImpl = fetch,
    timeoutMs = 45_000,
  }: EvaluateCustomerAiCaseOptions,
): Promise<CustomerAiEvalRunResult> {
  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(endpointUrl, {
      body: JSON.stringify({
        messages: [{ role: "user", content: evalCase.customerPrompt }],
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: controller.signal,
    })
    const raw = await response.text()
    const answer = decodeAssistantStream(raw)
    const score = scoreCustomerEvalAnswer(evalCase, answer)

    return {
      ...score,
      answer,
      durationMs: Date.now() - startedAt,
      error: response.ok ? undefined : raw.slice(0, 500),
      id: evalCase.id,
      passed: response.ok && score.passed,
      prompt: evalCase.customerPrompt,
      status: response.status,
    }
  } catch (error) {
    return {
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
    }
  } finally {
    clearTimeout(timeout)
  }
}
