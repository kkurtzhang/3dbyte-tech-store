import { Buffer } from "node:buffer"

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

export type LangfuseEvalScorePublisher = {
  // eslint-disable-next-line no-unused-vars -- Type-only payload name keeps score publishing typed.
  createScore: (score: LangfuseEvalScorePayload) => Promise<unknown>
}

export type PublishLangfuseEvalScoresOptions = {
  concurrency?: number
  environment?: string
}

type LangfuseScoreFetch = typeof globalThis.fetch

type LangfuseHttpScoreClientOptions = {
  baseUrl: string
  fetchImpl?: LangfuseScoreFetch
  publicKey: string
  secretKey: string
}

const DEFAULT_LANGFUSE_SCORE_UPLOAD_CONCURRENCY = 5
const MAX_LANGFUSE_ERROR_BODY_CHARS = 500

function normalizeLangfusePublicApiBaseUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/g, "")

  if (!normalized) {
    throw new Error("LANGFUSE_HOST is required for score uploads.")
  }

  if (normalized.endsWith("/api/public")) {
    return normalized
  }

  return `${normalized}/api/public`
}

function createBasicAuthHeader(publicKey: string, secretKey: string) {
  return `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString("base64")}`
}

function parseJsonObject(value: string) {
  if (!value.trim()) {
    return undefined
  }

  try {
    const parsed: unknown = JSON.parse(value)

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}

function truncateErrorBody(value: string) {
  return value.length > MAX_LANGFUSE_ERROR_BODY_CHARS
    ? `${value.slice(0, MAX_LANGFUSE_ERROR_BODY_CHARS)}...`
    : value
}

export class LangfuseHttpScoreClient implements LangfuseEvalScorePublisher {
  private readonly apiBaseUrl: string
  private readonly authorization: string
  private readonly fetchImpl: LangfuseScoreFetch

  constructor({
    baseUrl,
    fetchImpl = globalThis.fetch,
    publicKey,
    secretKey,
  }: LangfuseHttpScoreClientOptions) {
    this.apiBaseUrl = normalizeLangfusePublicApiBaseUrl(baseUrl)
    this.authorization = createBasicAuthHeader(publicKey, secretKey)
    this.fetchImpl = fetchImpl
  }

  async createScore(score: LangfuseEvalScorePayload) {
    const response = await this.fetchImpl(`${this.apiBaseUrl}/scores`, {
      body: JSON.stringify(score),
      headers: {
        authorization: this.authorization,
        "content-type": "application/json",
      },
      method: "POST",
    })
    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(
        `Langfuse score create failed with status ${response.status}: ${truncateErrorBody(responseText)}`,
      )
    }

    const parsed = parseJsonObject(responseText)
    const id = parsed?.id

    if (typeof id !== "string" || !id) {
      throw new Error("Langfuse score create response did not include an id.")
    }

    return id
  }
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

function buildLangfuseEvalScorePayloads(
  report: CustomerAiEvalReport,
  options: PublishLangfuseEvalScoresOptions,
) {
  return report.results.flatMap((result) => {
    const scores =
      result.scores ?? buildLangfuseEvalScores(result, report.summary)
    const target = getLangfuseScoreTarget(result)

    return scores.map((score) => ({
      ...score,
      environment: options.environment,
      metadata: toScoreMetadataRecord(score.metadata, report),
      ...target,
    }))
  })
}

async function publishLangfuseScoreBatch(
  batch: LangfuseEvalScorePayload[],
  client: LangfuseEvalScorePublisher,
) {
  const results = await Promise.allSettled(
    batch.map((score) => client.createScore(score)),
  )

  return {
    failed: results.filter((result) => result.status === "rejected").length,
    published: results.filter((result) => result.status === "fulfilled").length,
  }
}

export async function publishLangfuseEvalScores(
  report: CustomerAiEvalReport,
  client: LangfuseEvalScorePublisher,
  options: PublishLangfuseEvalScoresOptions = {},
) {
  const payloads = buildLangfuseEvalScorePayloads(report, options)
  const concurrency =
    options.concurrency && options.concurrency > 0
      ? Math.floor(options.concurrency)
      : DEFAULT_LANGFUSE_SCORE_UPLOAD_CONCURRENCY
  let publishedCount = 0
  let failedCount = 0

  for (
    let index = 0;
    index < payloads.length;
    index += concurrency
  ) {
    const { failed, published } = await publishLangfuseScoreBatch(
      payloads.slice(index, index + concurrency),
      client,
    )

    publishedCount += published
    failedCount += failed
  }

  if (failedCount > 0) {
    throw new Error(
      `Failed to publish ${failedCount}/${payloads.length} Langfuse eval scores.`,
    )
  }

  return publishedCount
}
