import type {
  CustomerAiEvalRunResult,
  CustomerAiEvalTraceContext,
} from "./customer-eval-runner"
import type { CustomerAiEvalCase } from "./customer-eval-types"

type EvaluateCase = typeof import("./customer-eval-runner").evaluateCustomerAiCase

function defaultSleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

type Sleep = typeof defaultSleep

type RunCustomerAiEvalSuiteOptions = {
  attempts: number
  endpointUrl: string
  evalCases: CustomerAiEvalCase[]
  evaluateCase: EvaluateCase
  minimumRequestIntervalMs?: number
  now?: () => number
  sleep?: Sleep
  traceContext?: CustomerAiEvalTraceContext
}

const DEFAULT_REPEATED_REQUEST_INTERVAL_MS = 6_500

function createRequestPacer({
  minimumIntervalMs,
  now,
  sleep,
}: {
  minimumIntervalMs: number
  now: () => number
  sleep: Sleep
}) {
  let lastRequestStartedAt: number | undefined

  return async () => {
    if (lastRequestStartedAt !== undefined) {
      const remainingDelay =
        minimumIntervalMs - (now() - lastRequestStartedAt)

      if (remainingDelay > 0) {
        await sleep(remainingDelay)
      }
    }

    lastRequestStartedAt = now()
  }
}

function diagnosticsMatch(
  expected: CustomerAiEvalRunResult["diagnostics"],
  actual: CustomerAiEvalRunResult["diagnostics"],
) {
  return JSON.stringify(expected ?? null) === JSON.stringify(actual ?? null)
}

const REQUIRED_DIAGNOSTIC_FIELDS: Array<
  keyof NonNullable<CustomerAiEvalRunResult["diagnostics"]>
> = [
  "guardrailsVersion",
  "model",
  "promptVersion",
  "releaseSha",
  "temperature",
]

function diagnosticsComplete(
  diagnostics: CustomerAiEvalRunResult["diagnostics"],
) {
  if (!diagnostics) {
    return false
  }

  return REQUIRED_DIAGNOSTIC_FIELDS.every((field) => {
    const value = diagnostics[field]

    return Boolean(value && value !== "unknown")
  })
}

function appendError(current: string | undefined, next: string) {
  return current ? `${current}; ${next}` : next
}

export function resolveEvalAttempts(value: string | undefined) {
  if (value === undefined) {
    return 1
  }

  const attempts = Number(value)

  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 10) {
    throw new Error(
      "AI_ASSISTANT_EVAL_ATTEMPTS must be an integer between 1 and 10.",
    )
  }

  return attempts
}

export async function runCustomerAiEvalSuite({
  attempts,
  endpointUrl,
  evalCases,
  evaluateCase,
  minimumRequestIntervalMs = DEFAULT_REPEATED_REQUEST_INTERVAL_MS,
  now = Date.now,
  sleep = defaultSleep,
  traceContext,
}: RunCustomerAiEvalSuiteOptions) {
  const beforeRequest =
    attempts > 1
      ? createRequestPacer({
          minimumIntervalMs: minimumRequestIntervalMs,
          now,
          sleep,
        })
      : undefined
  const results: CustomerAiEvalRunResult[] = []
  let expectedDiagnostics: CustomerAiEvalRunResult["diagnostics"]

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    for (const evalCase of evalCases) {
      const result = await evaluateCase(evalCase, {
        beforeRequest,
        endpointUrl,
        traceContext,
      })
      const diagnosticsIncomplete =
        attempts > 1 && !diagnosticsComplete(result.diagnostics)
      const diagnosticsChanged =
        !diagnosticsIncomplete &&
        expectedDiagnostics !== undefined &&
        !diagnosticsMatch(expectedDiagnostics, result.diagnostics)

      if (expectedDiagnostics === undefined && !diagnosticsIncomplete) {
        expectedDiagnostics = result.diagnostics
      }

      results.push({
        ...result,
        attempt,
        attemptCount: attempts,
        ...(diagnosticsIncomplete
          ? {
              error: appendError(
                result.error,
                "Runtime diagnostics are incomplete for the consistency run.",
              ),
              passed: false,
            }
          : diagnosticsChanged
            ? {
                error: appendError(
                  result.error,
                  "Runtime diagnostics changed during the consistency run.",
                ),
                passed: false,
              }
            : {}),
      })
    }
  }

  return results
}
