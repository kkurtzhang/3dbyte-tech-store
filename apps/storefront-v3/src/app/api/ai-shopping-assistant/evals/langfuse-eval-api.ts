import { Buffer } from "node:buffer"

import type {
  CustomerAiEvalReport,
  LangfuseEvalScorePayload,
  LangfuseEvalScorePublisher,
} from "./customer-eval-report"

export type LangfuseEvalTraceReader = {
  // eslint-disable-next-line no-unused-vars -- Type-only trace id keeps trace polling typed.
  traceExists: (traceId: string) => Promise<boolean>
}

export type WaitForLangfuseEvalTracesOptions = {
  now?: () => number
  pollIntervalMs?: number
  sleep?: (delayMs: number) => Promise<void>
  timeoutMs?: number
}

type LangfuseScoreFetch = typeof globalThis.fetch

type LangfuseHttpScoreClientOptions = {
  baseUrl: string
  fetchImpl?: LangfuseScoreFetch
  publicKey: string
  secretKey: string
}

const DEFAULT_LANGFUSE_TRACE_POLL_INTERVAL_MS = 2_000
const DEFAULT_LANGFUSE_TRACE_WAIT_TIMEOUT_MS = 60_000
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

function defaultSleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

function getEvalTraceIds(report: CustomerAiEvalReport) {
  const missingTraceCaseIds = report.results
    .filter((result) => !result.traceId)
    .map((result) => result.id)

  if (missingTraceCaseIds.length > 0) {
    throw new Error(
      `Eval case(s) ${missingTraceCaseIds.join(", ")} did not return a Langfuse trace ID.`,
    )
  }

  return Array.from(
    new Set(
      report.results
        .map((result) => result.traceId)
        .filter((traceId): traceId is string => Boolean(traceId)),
    ),
  )
}

export class LangfuseHttpScoreClient
  implements LangfuseEvalScorePublisher, LangfuseEvalTraceReader
{
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

  async traceExists(traceId: string) {
    const response = await this.fetchImpl(
      `${this.apiBaseUrl}/traces/${encodeURIComponent(traceId)}?fields=core`,
      {
        headers: {
          authorization: this.authorization,
        },
        method: "GET",
      },
    )
    const responseText = await response.text()

    if (response.status === 404) {
      return false
    }

    if (!response.ok) {
      throw new Error(
        `Langfuse trace lookup failed with status ${response.status}: ${truncateErrorBody(responseText)}`,
      )
    }

    const parsed = parseJsonObject(responseText)

    if (parsed?.id !== traceId) {
      throw new Error(
        `Langfuse trace lookup returned an unexpected trace id for ${traceId}.`,
      )
    }

    return true
  }
}

export async function waitForLangfuseEvalTraces(
  report: CustomerAiEvalReport,
  client: LangfuseEvalTraceReader,
  options: WaitForLangfuseEvalTracesOptions = {},
) {
  const traceIds = getEvalTraceIds(report)
  const now = options.now ?? Date.now
  const pollIntervalMs =
    options.pollIntervalMs ?? DEFAULT_LANGFUSE_TRACE_POLL_INTERVAL_MS
  const sleep = options.sleep ?? defaultSleep
  const timeoutMs =
    options.timeoutMs ?? DEFAULT_LANGFUSE_TRACE_WAIT_TIMEOUT_MS
  const deadline = now() + timeoutMs
  let pendingTraceIds = traceIds

  while (pendingTraceIds.length > 0) {
    const traceStates = await Promise.all(
      pendingTraceIds.map(async (traceId) => ({
        exists: await client.traceExists(traceId),
        traceId,
      })),
    )

    pendingTraceIds = traceStates
      .filter((trace) => !trace.exists)
      .map((trace) => trace.traceId)

    if (pendingTraceIds.length === 0) {
      return traceIds.length
    }

    const remainingMs = deadline - now()

    if (remainingMs <= 0) {
      throw new Error(
        `Timed out waiting for ${pendingTraceIds.length}/${traceIds.length} Langfuse eval traces. Check staging storefront access to Langfuse and the OTLP endpoint, including app-side Tailscale connectivity.`,
      )
    }

    await sleep(Math.min(pollIntervalMs, remainingMs))
  }

  return traceIds.length
}
