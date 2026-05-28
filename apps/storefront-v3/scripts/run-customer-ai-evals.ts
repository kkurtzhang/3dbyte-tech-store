/// <reference types="node" />

import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import { customerAiEvalCases } from "../src/app/api/ai-shopping-assistant/evals/customer-evals"
import {
  buildCustomerAiEvalReport,
  evaluateCustomerAiCase,
} from "../src/app/api/ai-shopping-assistant/evals/customer-eval-runner"

function getEnvValue(key: string) {
  const value = process.env[key]?.trim()

  return value ? value : undefined
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
  const selectedCases = requestedIds?.length
    ? customerAiEvalCases.filter((evalCase) => requestedIds.includes(evalCase.id))
    : customerAiEvalCases
  const limit = Number.parseInt(getEnvValue("AI_ASSISTANT_EVAL_LIMIT") ?? "", 10)

  return Number.isFinite(limit) && limit > 0
    ? selectedCases.slice(0, limit)
    : selectedCases
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

  return `[${status}] ${result.id} status=${result.status ?? "n/a"} duration=${result.durationMs}ms chars=${result.answerChars} ${includeText}${warningText}`
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
  const outputJson = getEnvValue("AI_ASSISTANT_EVAL_OUTPUT") === "json"
  const outputFile = getEnvValue("AI_ASSISTANT_EVAL_OUTPUT_FILE")

  if (!evalCases.length) {
    throw new Error("No customer AI eval cases matched the requested filters.")
  }

  const results = []

  for (const evalCase of evalCases) {
    const result = await evaluateCustomerAiCase(evalCase, { endpointUrl })

    results.push(result)

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

  const report = buildCustomerAiEvalReport(results, endpointUrl)

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
      `Summary: ${report.summary.passed}/${report.summary.total} passed, ${report.summary.failed} failed, ${report.summary.warnings} warnings`,
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
