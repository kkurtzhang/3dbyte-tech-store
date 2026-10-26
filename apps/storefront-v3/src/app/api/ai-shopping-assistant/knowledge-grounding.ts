import type { ApprovedKnowledgeDocument } from "@3dbyte-tech-store/shared-types"
import { parseApprovedKnowledgeDocument } from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs"
import type { TextStreamPart, ToolSet } from "ai"

import { includeConflictingEvidence, knowledgeSources, summarizeKnowledge } from "./knowledge-summary"
import type { CommerceExecution } from "./commerce-execution"
import type { KnowledgeExecution } from "./knowledge-execution"
import { createAssistantVisibleTextTransform } from "./visible-output-sanitizer"

const MAX_BUFFERED_TEXT = 64_000
const MAX_DOCUMENTS = 4
const NO_EVIDENCE =
  "I could not verify current approved evidence for this request. The requested specifications and safety limits remain unknown; please identify the exact product or variant."
const TOO_LONG =
  "This reply exceeded the response limit. Please ask a narrower question."

/** Bounded approved-fact summary, not a claim that every question was answered. */
export function assembleKnowledgeAnswer(
  execution: Pick<KnowledgeExecution, "results">,
  question = "",
  now = Date.now(),
) {
  const documents = new Map<string, ApprovedKnowledgeDocument>()
  const rejected = new Set<string>()
  let unavailable = false
  for (const result of Array.from(execution.results.values())) {
    if (!result) {
      unavailable = true
      continue
    }
    for (const raw of result.documents) {
      const document = parseApprovedKnowledgeDocument(raw, now)
      const previous = documents.get(raw.document_id)
      if (
        !document ||
        rejected.has(raw.document_id) ||
        (previous && JSON.stringify(previous) !== JSON.stringify(document))
      ) {
        documents.delete(raw.document_id)
        rejected.add(raw.document_id)
        unavailable = true
        continue
      }
      documents.set(document.document_id, document)
    }
  }
  const validated = Array.from(documents.values())
  const selected = validated.slice(0, MAX_DOCUMENTS)
  const evidence = includeConflictingEvidence(selected, validated, question)
  const sources = knowledgeSources(evidence, question)
  if (!selected.length) return { text: NO_EVIDENCE, sources }
  const sections = summarizeKnowledge(selected, question, evidence)
  return {
    sources,
    text: [
      ...sections,
      ...(new Set(selected.map((document) => document.product_id)).size > 1
        ? ["Evidence applies only to the named product and scope; it cannot establish claims about another product."]
        : []),
      ...(documents.size > MAX_DOCUMENTS
        ? [
            "More evidence was returned; only four documents are summarized. Conflicting evidence is retained in Sources. Please narrow the request.",
          ]
        : []),
      ...(unavailable
        ? ["Some evidence could not be validated and is not used here."]
        : []),
    ].join("\n\n"),
  }
}

export function renderKnowledgeEvidence(
  execution: Pick<KnowledgeExecution, "results">,
  now = Date.now(),
  question = "",
) {
  return assembleKnowledgeAnswer(execution, question, now).text
}

/**
 * Hold prose until the turn's tool use is known: pre-tool claims cannot be unsent.
 * Tool/status events keep streaming. A knowledge turn replaces ALL model prose
 * with current validated facts; other turns retain their text, after email masking.
 */
export function createKnowledgeGroundingTransform<TOOLS extends ToolSet>(
  execution: KnowledgeExecution,
  suppliedEmails: readonly string[],
  hooks: { onFlush?: () => void; onText?: (text: string) => void } = {},
  context: { question?: string; commerce?: CommerceExecution } = {},
) {
  return () => {
    type Part = TextStreamPart<TOOLS>
    let text = ""
    let tooLong = false
    let knowledgeToolSeen = false
    let failed = false
    let emitted = false
    const emit = (controller: TransformStreamDefaultController<Part>) => {
      if (emitted) return
      emitted = true
      // An interrupted stream cannot establish a complete response.
      if (failed) return
      const knowledgeTurn = execution.attempted || knowledgeToolSeen
      const evidence = knowledgeTurn
        ? assembleKnowledgeAnswer(execution, context.question)
        : null
      const output = evidence
        ? [
            evidence.text,
            ...Array.from(context.commerce?.summaries.values() ?? []),
          ].join("\n\n")
        : tooLong
          ? TOO_LONG
          : text
      if (!output) return
      const id = "evidence-grounded-answer"
      controller.enqueue({ type: "text-start", id } as Part)
      controller.enqueue({ type: "text-delta", id, text: output } as Part)
      controller.enqueue({ type: "text-end", id } as Part)
      for (const source of evidence?.sources ?? [])
        controller.enqueue({ type: "source", ...source } as Part)
      text = ""
    }
    const grounding = new TransformStream<Part, Part>({
      transform(chunk, controller) {
        // sendSources is enabled only for our validated citations, never provider sources.
        if (chunk.type === "source") return
        if (chunk.type === "text-delta") {
          if (text.length + chunk.text.length > MAX_BUFFERED_TEXT) {
            text = ""
            tooLong = true
          } else if (!tooLong) text += chunk.text
          return
        }
        if (chunk.type === "text-start" || chunk.type === "text-end") return
        if (
          (chunk.type === "tool-input-start" ||
            chunk.type === "tool-call" ||
            chunk.type === "tool-error" ||
            chunk.type === "tool-result") &&
          chunk.toolName === "searchKnowledge"
        )
          knowledgeToolSeen = true
        if (chunk.type === "error" || chunk.type === "abort") {
          failed = true
          text = ""
        }
        if (chunk.type === "finish") emit(controller)
        controller.enqueue(chunk)
      },
      // A stream closed without the SDK finish event is incomplete; discard prose.
      flush() {
        text = ""
      },
    })
    const redaction = createAssistantVisibleTextTransform<TOOLS>(
      suppliedEmails,
      hooks,
    )()
    return {
      writable: grounding.writable,
      readable: grounding.readable.pipeThrough(redaction),
    }
  }
}
