import type { CustomerAiEvalRunResult } from "./customer-eval-runner"

export type LangfuseEvalScore = {
  comment?: string
  dataType: "BOOLEAN" | "NUMERIC"
  metadata?: Record<string, unknown>
  name: string
  value: number
}

export type CustomerAiEvalSummary = {
  attemptsPerCase: number
  casesFailed: number
  casesStable: number
  casesTotal: number
  endpointUrl: string
  failed: number
  generatedAt: string
  passAt1: number
  passToK: number
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

export type BuildCustomerAiEvalReportOptions = {
  promptLabel?: string
  promptName?: string
  runName?: string
}

export type LangfuseEvalScorePayload = LangfuseEvalScore & {
  environment?: string
  sessionId?: string
  traceId?: string
}

export type LangfuseEvalScoreClient = {
  flush?: () => Promise<void>
  score: {
    // eslint-disable-next-line no-unused-vars -- Type-only payload name keeps score publishing typed.
    create: (score: LangfuseEvalScorePayload) => void
    flush?: () => Promise<void>
  }
}

export type PublishLangfuseEvalScoresOptions = {
  environment?: string
}

function buildScoreMetadata(
  result: CustomerAiEvalRunResult,
  options: BuildCustomerAiEvalReportOptions,
) {
  return {
    promptLabel: options.promptLabel,
    promptName: options.promptName,
    runName: options.runName,
    attempt: result.attempt,
    attemptCount: result.attemptCount,
    diagnostics: result.diagnostics,
    evalCaseId: result.id,
    tags: result.tags,
    turnCount: result.turnCount,
  }
}

export function buildLangfuseEvalScores(
  result: CustomerAiEvalRunResult,
  options: BuildCustomerAiEvalReportOptions = {},
): LangfuseEvalScore[] {
  const expectedCueCount =
    result.includeMatched.length + result.includeMissing.length
  const groundingCueMatch =
    expectedCueCount > 0 ? result.includeMatched.length / expectedCueCount : 0
  const metadata = buildScoreMetadata(result, options)
  const baseScores: LangfuseEvalScore[] = [
    {
      comment: result.passed
        ? "Deterministic eval gates passed."
        : "One or more deterministic eval gates failed.",
      dataType: "BOOLEAN",
      metadata,
      name: "deterministic_pass",
      value: result.passed ? 1 : 0,
    },
    {
      comment: `${result.includeMatched.length}/${expectedCueCount} expected answer cues matched.`,
      dataType: "NUMERIC",
      metadata,
      name: "grounding_cue_match",
      value: Number(groundingCueMatch.toFixed(4)),
    },
    {
      comment: result.formatWarnings.join("; ") || undefined,
      dataType: "NUMERIC",
      metadata,
      name: "format_warning_count",
      value: result.formatWarnings.length,
    },
    {
      comment: result.forbiddenMatches.join("; ") || undefined,
      dataType: "NUMERIC",
      metadata,
      name: "forbidden_claim_count",
      value: result.forbiddenMatches.length,
    },
  ]
  const evidenceScores: LangfuseEvalScore[] = (
    result.automatedChecks ?? []
  ).map((check) => ({
    comment: check.comment,
    dataType: "BOOLEAN",
    metadata,
    name: check.name,
    value: check.passed ? 1 : 0,
  }))

  return [...baseScores, ...evidenceScores]
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
  const attemptsPerCase = Math.max(
    1,
    ...resultsWithScores.map((result) => result.attemptCount ?? 1),
  )
  const resultsByCase = resultsWithScores.reduce(
    (grouped, result) => {
      const existing = grouped.get(result.id) ?? []

      return new Map(grouped).set(result.id, [...existing, result])
    },
    new Map<string, typeof resultsWithScores>(),
  )
  const casesTotal = resultsByCase.size
  const casesStable = Array.from(resultsByCase.values()).filter(
    (caseResults) =>
      caseResults.length === attemptsPerCase &&
      caseResults.every((result) => result.passed),
  ).length
  const firstAttemptPassed = Array.from(resultsByCase.values()).filter(
    (caseResults) =>
      caseResults.find((result) => (result.attempt ?? 1) === 1)?.passed,
  ).length

  return {
    results: resultsWithScores,
    summary: {
      attemptsPerCase,
      casesFailed: casesTotal - casesStable,
      casesStable,
      casesTotal,
      endpointUrl,
      failed: resultsWithScores.filter((result) => !result.passed).length,
      generatedAt,
      passAt1:
        casesTotal > 0
          ? Number((firstAttemptPassed / casesTotal).toFixed(4))
          : 0,
      passToK:
        casesTotal > 0 ? Number((casesStable / casesTotal).toFixed(4)) : 0,
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

function getLangfuseScoreTarget(result: CustomerAiEvalRunResult) {
  if ((result.turnCount ?? 1) > 1 && result.sessionId) {
    return { sessionId: result.sessionId }
  }

  if (result.traceId) {
    return { traceId: result.traceId }
  }

  if (result.sessionId) {
    return { sessionId: result.sessionId }
  }

  return {}
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
        ...getLangfuseScoreTarget(result),
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
