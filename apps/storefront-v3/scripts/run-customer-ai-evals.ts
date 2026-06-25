/// <reference types="node" />

import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import {
  selectCustomerAiEvalCases,
  type CustomerAiEvalSuite,
} from "../src/app/api/ai-shopping-assistant/evals/customer-evals"
import {
  buildCustomerAiEvalReport,
  evaluateCustomerAiCase,
  publishLangfuseEvalScores,
} from "../src/app/api/ai-shopping-assistant/evals/customer-eval-runner"
import {
  resolveEvalAttempts,
  runCustomerAiEvalSuite,
} from "../src/app/api/ai-shopping-assistant/evals/customer-eval-execution"

function getEnvValue(key: string) {
  const value = process.env[key]?.trim()

  return value ? value : undefined
}

function getFirstEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = getEnvValue(key)

    if (value) {
      return value
    }
  }

  return undefined
}

function isTruthyEnv(key: string) {
  return ["1", "true", "yes"].includes(getEnvValue(key)?.toLowerCase() ?? "")
}

function resolveEndpointUrl() {
  const baseUrl =
    getEnvValue("AI_ASSISTANT_EVAL_BASE_URL") ?? "http://127.0.0.1:3001"

  return new URL("/api/ai-shopping-assistant", baseUrl).toString()
}

function resolveCases() {
  const requestedIds = getEnvValue("AI_ASSISTANT_EVAL_CASES")
    ?.split(",")
    .map((id: string) => id.trim())
    .filter(Boolean)
  const limit = Number.parseInt(getEnvValue("AI_ASSISTANT_EVAL_LIMIT") ?? "", 10)
  const suiteValue = getEnvValue("AI_ASSISTANT_EVAL_SUITE") ?? "release"

  if (!["smoke", "release", "extended"].includes(suiteValue)) {
    throw new Error(
      "AI_ASSISTANT_EVAL_SUITE must be smoke, release, or extended.",
    )
  }

  return selectCustomerAiEvalCases({
    ids: requestedIds,
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    suite: suiteValue as CustomerAiEvalSuite,
  })
}

function toTraceSafeId(value: string) {
  const safeId = value
    .replace(/[^a-zA-Z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)

  return safeId || "customer-ai-evals"
}

function resolveRunName(generatedAt: string) {
  return (
    getEnvValue("AI_ASSISTANT_EVAL_RUN_NAME") ??
    `customer-ai-evals-${generatedAt}`
  )
}

function resolveTraceContext(runName: string) {
  const sessionId =
    getEnvValue("AI_ASSISTANT_EVAL_SESSION_ID") ?? toTraceSafeId(runName)

  return {
    chatbotId:
      getEnvValue("AI_ASSISTANT_EVAL_CHATBOT_ID") ??
      "storefront.customer-ai-evals",
    sessionId,
    surface:
      getEnvValue("AI_ASSISTANT_EVAL_SURFACE") ?? "customer-eval-runner",
  }
}

async function createLangfuseScoreClient() {
  const publicKey = getEnvValue("LANGFUSE_PUBLIC_KEY")
  const secretKey = getEnvValue("LANGFUSE_SECRET_KEY")

  if (!publicKey || !secretKey) {
    throw new Error(
      "LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are required when AI_ASSISTANT_EVAL_UPLOAD_LANGFUSE is enabled.",
    )
  }

  const { LangfuseClient } = await import("@langfuse/client")

  return new LangfuseClient({
    baseUrl: getEnvValue("LANGFUSE_HOST"),
    publicKey,
    secretKey,
  })
}

function formatResultLine(
  result: Awaited<ReturnType<typeof evaluateCustomerAiCase>>,
) {
  const status = result.passed ? "PASS" : "FAIL"
  const includeText = result.includeMatched.length
    ? `matched: ${result.includeMatched.join(", ")}`
    : `missing: ${result.includeMissing.join(", ")}`
  const warningText = result.formatWarnings.length
    ? ` warnings=${result.formatWarnings.length}`
    : ""

  const attemptText = `attempt=${result.attempt ?? 1}/${result.attemptCount ?? 1}`

  return `[${status}] ${result.id} ${attemptText} status=${result.status ?? "n/a"} duration=${result.durationMs}ms chars=${result.answerChars} ${includeText}${warningText}`
}

async function writeReportFile(
  outputFile: string,
  report: ReturnType<typeof buildCustomerAiEvalReport>,
) {
  await mkdir(dirname(outputFile), { recursive: true })
  await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, "utf8")
}

async function main() {
  const endpointUrl = resolveEndpointUrl()
  const evalCases = resolveCases()
  const attempts = resolveEvalAttempts(
    getEnvValue("AI_ASSISTANT_EVAL_ATTEMPTS"),
  )
  const generatedAt = new Date().toISOString()
  const runName = resolveRunName(generatedAt)
  const traceContext = resolveTraceContext(runName)
  const outputJson = getEnvValue("AI_ASSISTANT_EVAL_OUTPUT") === "json"
  const outputFile = getEnvValue("AI_ASSISTANT_EVAL_OUTPUT_FILE")
  const reportMetadata = {
    promptLabel: getFirstEnvValue(
      "AI_ASSISTANT_PROMPT_LABEL",
      "LANGFUSE_ASSISTANT_PROMPT_LABEL",
    ),
    promptName: getFirstEnvValue(
      "AI_ASSISTANT_PROMPT_NAME",
      "LANGFUSE_ASSISTANT_PROMPT_NAME",
    ),
    runName,
  }

  if (!evalCases.length) {
    throw new Error("No customer AI eval cases matched the requested filters.")
  }

  const results = await runCustomerAiEvalSuite({
    attempts,
    endpointUrl,
    evalCases,
    evaluateCase: evaluateCustomerAiCase,
    traceContext,
  })

  for (const result of results) {
    if (!outputJson) {
      console.log(formatResultLine(result))

      for (const violation of result.forbiddenMatches) {
        console.log(`  forbidden: ${violation}`)
      }

      if (result.error) {
        console.log(`  error: ${result.error}`)
      }
    }
  }

  const report = buildCustomerAiEvalReport(
    results,
    endpointUrl,
    generatedAt,
    reportMetadata,
  )

  if (isTruthyEnv("AI_ASSISTANT_EVAL_UPLOAD_LANGFUSE")) {
    const langfuse = await createLangfuseScoreClient()
    const publishedCount = await publishLangfuseEvalScores(report, langfuse, {
      environment:
        getEnvValue("LANGFUSE_EVAL_ENVIRONMENT") ?? getEnvValue("APP_ENV"),
    })

    if (!outputJson) {
      console.log(
        `Published ${publishedCount} eval scores to Langfuse session ${traceContext.sessionId}`,
      )
    }
  }

  if (outputFile) {
    await writeReportFile(outputFile, report)

    if (!outputJson) {
      console.log(`Wrote eval report to ${outputFile}`)
    }
  }

  if (outputJson) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(
      `Summary: ${report.summary.passed}/${report.summary.total} attempts passed, ${report.summary.casesStable}/${report.summary.casesTotal} cases stable, pass@1=${report.summary.passAt1}, pass^${report.summary.attemptsPerCase}=${report.summary.passToK}, ${report.summary.warnings} warnings`,
    )
  }

  if (report.summary.failed > 0) {
    process.exitCode = 1
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
