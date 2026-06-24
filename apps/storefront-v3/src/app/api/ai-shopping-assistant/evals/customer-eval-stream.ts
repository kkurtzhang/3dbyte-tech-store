import type { CustomerAiEvalToolCall } from "./customer-eval-types"

type JsonRecord = Record<string, unknown>

export type CustomerAiEvalStreamEvidence = {
  answer: string
  toolCalls: CustomerAiEvalToolCall[]
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function parseStreamPayload(line: string) {
  const trimmed = line.trim()

  if (!trimmed || trimmed === "data: [DONE]" || trimmed === "[DONE]") {
    return undefined
  }

  return trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed
}

function decodeLegacyText(payload: string) {
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

function getString(record: JsonRecord, key: string) {
  const value = record[key]

  return typeof value === "string" && value.trim() ? value : undefined
}

function upsertToolCall(
  toolCalls: Map<string, CustomerAiEvalToolCall>,
  order: string[],
  toolCallId: string,
  update: Partial<CustomerAiEvalToolCall>,
) {
  const existing = toolCalls.get(toolCallId)

  if (!existing) {
    order.push(toolCallId)
  }

  toolCalls.set(toolCallId, {
    state: "input-start",
    toolCallId,
    toolName: "unknown",
    ...existing,
    ...update,
  })
}

export function decodeAssistantStreamEvidence(
  streamText: string,
): CustomerAiEvalStreamEvidence {
  const textChunks: string[] = []
  const toolCalls = new Map<string, CustomerAiEvalToolCall>()
  const toolCallOrder: string[] = []

  for (const line of streamText.split(/\r?\n/)) {
    const payload = parseStreamPayload(line)

    if (!payload) {
      continue
    }

    const legacyText = decodeLegacyText(payload)

    if (legacyText !== undefined) {
      textChunks.push(legacyText)
      continue
    }

    try {
      const parsed: unknown = JSON.parse(payload)

      if (Array.isArray(parsed) && parsed[0] === "text-delta") {
        if (typeof parsed[1] === "string") {
          textChunks.push(parsed[1])
        }
        continue
      }

      if (!isJsonRecord(parsed)) {
        continue
      }

      const textDelta =
        typeof parsed.delta === "string"
          ? parsed.delta
          : typeof parsed.textDelta === "string"
            ? parsed.textDelta
            : undefined

      if (parsed.type === "text-delta" && textDelta !== undefined) {
        textChunks.push(textDelta)
        continue
      }

      const toolCallId = getString(parsed, "toolCallId")

      if (!toolCallId) {
        continue
      }

      if (parsed.type === "tool-input-start") {
        upsertToolCall(toolCalls, toolCallOrder, toolCallId, {
          state: "input-start",
          toolName: getString(parsed, "toolName") ?? "unknown",
        })
      } else if (parsed.type === "tool-input-available") {
        upsertToolCall(toolCalls, toolCallOrder, toolCallId, {
          input: parsed.input,
          state: "input-available",
          toolName:
            getString(parsed, "toolName") ??
            toolCalls.get(toolCallId)?.toolName ??
            "unknown",
        })
      } else if (parsed.type === "tool-input-error") {
        upsertToolCall(toolCalls, toolCallOrder, toolCallId, {
          errorText: getString(parsed, "errorText") ?? "Tool input error",
          input: parsed.input,
          state: "input-error",
          toolName:
            getString(parsed, "toolName") ??
            toolCalls.get(toolCallId)?.toolName ??
            "unknown",
        })
      } else if (parsed.type === "tool-approval-request") {
        upsertToolCall(toolCalls, toolCallOrder, toolCallId, {
          approvalId: getString(parsed, "approvalId"),
          state: "approval-request",
        })
      } else if (parsed.type === "tool-output-available") {
        upsertToolCall(toolCalls, toolCallOrder, toolCallId, {
          output: parsed.output,
          state: "output-available",
        })
      } else if (parsed.type === "tool-output-error") {
        upsertToolCall(toolCalls, toolCallOrder, toolCallId, {
          errorText: getString(parsed, "errorText") ?? "Tool output error",
          state: "output-error",
        })
      } else if (parsed.type === "tool-output-denied") {
        upsertToolCall(toolCalls, toolCallOrder, toolCallId, {
          state: "output-denied",
        })
      }
    } catch {
      // Unknown stream chunks are irrelevant to deterministic evaluation.
    }
  }

  return {
    answer: textChunks.join("").trim(),
    toolCalls: toolCallOrder.flatMap((toolCallId) => {
      const toolCall = toolCalls.get(toolCallId)

      return toolCall ? [toolCall] : []
    }),
  }
}
