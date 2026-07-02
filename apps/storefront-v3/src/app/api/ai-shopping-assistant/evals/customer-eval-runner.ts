import { evaluateCustomerAiAutomatedChecks } from "./customer-eval-checks"
import { buildLangfuseEvalScores } from "./customer-eval-report"
import {
  decodeAssistantStreamEvidence,
  type CustomerAiEvalStreamEvidence,
} from "./customer-eval-stream"
import type { LangfuseEvalScore } from "./customer-eval-report"
import type {
  CustomerAiEvalAutomatedCheck,
  CustomerAiEvalCase,
  CustomerAiEvalToolCall,
} from "./customer-eval-types"

type AssistantResponse = {
  headers: Pick<globalThis.Headers, "get">
  ok: boolean
  status: number
  text: () => Promise<string>
}

type AssistantFetch = typeof globalThis.fetch

type AssistantMessage =
  | {
      content: string
      role: "user"
    }
  | {
      parts: Array<Record<string, unknown>>
      role: "assistant"
    }

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
  attempt?: number
  attemptCount?: number
  automatedChecks?: CustomerAiEvalAutomatedCheck[]
  diagnostics?: CustomerAiEvalDiagnostics
  durationMs: number
  error?: string
  id: string
  prompt: string
  scores?: LangfuseEvalScore[]
  sessionId?: string
  status?: number
  tags?: string[]
  toolCalls?: CustomerAiEvalToolCall[]
  traceId?: string
  turnCount?: number
}

export type EvaluateCustomerAiCaseOptions = {
  beforeRequest?: () => Promise<void>
  endpointUrl: string
  fetchImpl?: AssistantFetch
  timeoutMs?: number
  traceContext?: CustomerAiEvalTraceContext
}

export type CustomerAiEvalTraceContext = {
  chatbotId?: string
  sessionId?: string
  surface?: string
  userId?: string
}

export type CustomerAiEvalDiagnostics = {
  guardrailsVersion: string
  model: string
  promptVersion: string
  releaseSha: string
  temperature: string
}

const defaultForbiddenPatterns = [
  /ticket (?:has been|was) created/i,
  /created a support ticket/i,
  /created an order/i,
  /placed (?:an|the) order/i,
  /changed your cart/i,
  /updated your customer record/i,
  /guaranteed (?:stock|price|discount|compatibility|safety)/i,
  /download.*3DSets.*model/i,
  /official 3DSets.*(?:file|model)/i,
]
const CUSTOMER_EVAL_TRACE_ID_REQUEST_HEADER = "x-3db-customer-ai-eval-run"
const GUARDRAILS_VERSION_HEADER = "x-3db-ai-guardrails-version"
const MODEL_HEADER = "x-3db-ai-model"
const PROMPT_VERSION_HEADER = "x-3db-ai-prompt-version"
const RELEASE_SHA_HEADER = "x-3db-release-sha"
const TEMPERATURE_HEADER = "x-3db-ai-temperature"
const LANGFUSE_TRACE_ID_HEADER = "x-3db-langfuse-trace-id"

export { decodeAssistantStreamEvidence } from "./customer-eval-stream"
export {
  buildCustomerAiEvalReviewMarkdown,
  buildCustomerAiEvalReport,
  LangfuseHttpScoreClient,
  publishLangfuseEvalScores,
  publishVerifiedLangfuseEvalScores,
  waitForLangfuseEvalTraces,
} from "./customer-eval-report"
export type {
  BuildCustomerAiEvalReportOptions,
  CustomerAiEvalReport,
  CustomerAiEvalSummary,
  LangfuseEvalScore,
  LangfuseEvalScorePublisher,
  LangfuseEvalScorePayload,
  PublishLangfuseEvalScoresOptions,
  PublishVerifiedLangfuseEvalScoresOptions,
  WaitForLangfuseEvalTracesOptions,
} from "./customer-eval-report"

export function decodeAssistantStream(streamText: string) {
  return decodeAssistantStreamEvidence(streamText).answer
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

function collectForbiddenMatches(evalCase: CustomerAiEvalCase, answer: string) {
  return [
    ...defaultForbiddenPatterns,
    ...(evalCase.expectedAnswer.forbiddenPatterns ?? []).map(
      ({ pattern }) => pattern,
    ),
  ]
    .map((pattern) => answer.match(pattern)?.[0])
    .filter((match): match is string => Boolean(match))
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
  const forbiddenMatches = collectForbiddenMatches(evalCase, answer)
  const formatWarnings = collectFormatWarnings(evalCase, answer)
  const minimumCueMatches = evalCase.expectedAnswer.minimumCueMatches ?? 1

  return {
    answerChars: answer.length,
    forbiddenMatches,
    formatWarnings,
    includeMatched,
    includeMissing,
    passed:
      includeMatched.length >= minimumCueMatches &&
      forbiddenMatches.length === 0,
  }
}

function getResponseTraceId(response: AssistantResponse) {
  const traceId = response.headers.get(LANGFUSE_TRACE_ID_HEADER)?.trim()

  return traceId || undefined
}

function getResponseDiagnostics(
  response: AssistantResponse,
): CustomerAiEvalDiagnostics {
  return {
    guardrailsVersion:
      response.headers.get(GUARDRAILS_VERSION_HEADER)?.trim() || "unknown",
    model: response.headers.get(MODEL_HEADER)?.trim() || "unknown",
    promptVersion:
      response.headers.get(PROMPT_VERSION_HEADER)?.trim() || "unknown",
    releaseSha: response.headers.get(RELEASE_SHA_HEADER)?.trim() || "unknown",
    temperature: response.headers.get(TEMPERATURE_HEADER)?.trim() || "unknown",
  }
}

function getCustomerPrompts(evalCase: CustomerAiEvalCase) {
  return evalCase.customerPrompts?.length
    ? evalCase.customerPrompts
    : [evalCase.customerPrompt]
}

function buildAssistantHistoryMessage(
  evidence: CustomerAiEvalStreamEvidence,
): AssistantMessage | undefined {
  const toolParts = evidence.toolCalls.reduce<Array<Record<string, unknown>>>(
    (parts, toolCall) => {
      if (
        toolCall.state === "output-available" &&
        toolCall.input !== undefined &&
        toolCall.output !== undefined
      ) {
        return [
          ...parts,
          {
            input: toolCall.input,
            output: toolCall.output,
            state: toolCall.state,
            toolCallId: toolCall.toolCallId,
            type: `tool-${toolCall.toolName}`,
          },
        ]
      }

      if (toolCall.state === "output-error" && toolCall.errorText) {
        return [
          ...parts,
          {
            errorText: toolCall.errorText,
            state: toolCall.state,
            toolCallId: toolCall.toolCallId,
            type: `tool-${toolCall.toolName}`,
          },
        ]
      }

      return parts
    },
    [],
  )
  const parts = [
    ...toolParts,
    ...(evidence.answer
      ? [{ text: evidence.answer, type: "text" as const }]
      : []),
  ]

  return parts.length ? { role: "assistant", parts } : undefined
}

async function runAssistantTurn({
  beforeRequest,
  endpointUrl,
  fetchImpl,
  messages,
  timeoutMs,
  traceContext,
}: {
  beforeRequest?: () => Promise<void>
  endpointUrl: string
  fetchImpl: AssistantFetch
  messages: AssistantMessage[]
  timeoutMs: number
  traceContext?: CustomerAiEvalTraceContext
}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    await beforeRequest?.()
    const response = await fetchImpl(endpointUrl, {
      body: JSON.stringify({
        messages,
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

    return {
      diagnostics: getResponseDiagnostics(response),
      evidence: decodeAssistantStreamEvidence(raw),
      error: response.ok ? undefined : raw.slice(0, 500),
      ok: response.ok,
      status: response.status,
      traceId: getResponseTraceId(response),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function evaluateCustomerAiCase(
  evalCase: CustomerAiEvalCase,
  {
    endpointUrl,
    beforeRequest,
    fetchImpl = fetch,
    timeoutMs = 45_000,
    traceContext,
  }: EvaluateCustomerAiCaseOptions,
): Promise<CustomerAiEvalRunResult> {
  const startedAt = Date.now()
  const prompts = getCustomerPrompts(evalCase)
  const messages: AssistantMessage[] = []
  const toolCalls: CustomerAiEvalToolCall[] = []
  let finalEvidence: CustomerAiEvalStreamEvidence = {
    answer: "",
    toolCalls: [],
  }
  let finalError: string | undefined
  let finalDiagnostics: CustomerAiEvalDiagnostics | undefined
  let finalStatus: number | undefined
  let finalTraceId: string | undefined
  let responseOk = false

  try {
    for (let index = 0; index < prompts.length; index += 1) {
      const prompt = prompts[index]

      messages.push({ role: "user", content: prompt })
      const turn = await runAssistantTurn({
        beforeRequest,
        endpointUrl,
        fetchImpl,
        messages,
        timeoutMs,
        traceContext,
      })

      finalEvidence = turn.evidence
      finalDiagnostics = turn.diagnostics
      finalError = turn.error
      finalStatus = turn.status
      finalTraceId = turn.traceId
      responseOk = turn.ok
      toolCalls.push(...turn.evidence.toolCalls)

      if (!turn.ok || index === prompts.length - 1) {
        break
      }

      const assistantHistory = buildAssistantHistoryMessage(turn.evidence)

      if (assistantHistory) {
        messages.push(assistantHistory)
      }
    }

    const textScore = scoreCustomerEvalAnswer(evalCase, finalEvidence.answer)
    const automatedChecks = evaluateCustomerAiAutomatedChecks({
      answer: finalEvidence.answer,
      evalCase,
      prompts,
      toolCalls,
    })
    const result: CustomerAiEvalRunResult = {
      ...textScore,
      answer: finalEvidence.answer,
      automatedChecks,
      diagnostics: finalDiagnostics,
      durationMs: Date.now() - startedAt,
      error: finalError,
      id: evalCase.id,
      passed:
        responseOk &&
        textScore.passed &&
        automatedChecks.every((check) => check.passed),
      prompt: prompts.at(-1) ?? evalCase.customerPrompt,
      sessionId: traceContext?.sessionId,
      status: finalStatus,
      tags: evalCase.tags,
      toolCalls,
      traceId: finalTraceId,
      turnCount: prompts.length,
    }

    return {
      ...result,
      scores: buildLangfuseEvalScores(result),
    }
  } catch (error) {
    const failedResult: CustomerAiEvalRunResult = {
      answer: "",
      answerChars: 0,
      automatedChecks: [],
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown eval error",
      forbiddenMatches: [],
      formatWarnings: [],
      id: evalCase.id,
      includeMatched: [],
      includeMissing: evalCase.expectedAnswer.mustIncludeOneOf,
      passed: false,
      prompt: prompts.at(-1) ?? evalCase.customerPrompt,
      sessionId: traceContext?.sessionId,
      tags: evalCase.tags,
      toolCalls,
      turnCount: prompts.length,
    }

    return {
      ...failedResult,
      scores: buildLangfuseEvalScores(failedResult),
    }
  }
}
