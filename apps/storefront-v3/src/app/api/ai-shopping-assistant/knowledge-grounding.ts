import type { ApprovedKnowledgeDocument } from "@3dbyte-tech-store/shared-types"
import { parseApprovedKnowledgeDocument } from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs"
import type { TextStreamPart, ToolSet } from "ai"

import type { KnowledgeExecution } from "./knowledge-execution"
import { createAssistantVisibleTextTransform } from "./visible-output-sanitizer"

const MAX_BUFFERED_TEXT = 64_000
const MAX_DOCUMENTS = 4
const MAX_FACTS = 8
const NO_EVIDENCE =
  "I could not verify current approved evidence for this request. The requested specifications and safety limits remain unknown; please identify the exact product or variant."
const TOO_LONG =
  "This reply exceeded the response limit. Please ask a narrower question."

function plainMarkdown(value: string) {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\\`*_{}\[\]<>#!|~]/g, "\\$&")
}
function sourceLink(document: ApprovedKnowledgeDocument) {
  const url = document.source_url
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/[\s\\<>\[\]]/g, (character) => encodeURIComponent(character))
  return `[${plainMarkdown(document.document_title)}](${url})`
}

/** Bounded extractive rendering, not a semantic claim that every question was answered. */
export function renderKnowledgeEvidence(
  execution: Pick<KnowledgeExecution, "results">,
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
  if (!documents.size) return NO_EVIDENCE
  const sections = Array.from(documents.values())
    .slice(0, MAX_DOCUMENTS)
    .map((document) => {
      const known = document.facts.filter((fact) => fact.value !== null)
      const unknown = document.facts.filter((fact) => fact.value === null)
      return [
        `### ${plainMarkdown(document.product_title)}`,
        ...known
          .slice(0, MAX_FACTS)
          .map(
            (fact) =>
              `- **${plainMarkdown(fact.label)}:** ${plainMarkdown(fact.value!)}`,
          ),
        ...(known.length > MAX_FACTS
          ? [
              "Additional documented facts are omitted here; ask a narrower question.",
            ]
          : []),
        ...(unknown.length
          ? [
              `**Not established:** ${unknown.map((fact) => plainMarkdown(fact.label)).join(", ")}. These facts remain unknown; this evidence cannot confirm them.`,
            ]
          : []),
        `Source: ${sourceLink(document)}.`,
        document.binding_scope === "product"
          ? "Scope: model-level evidence only; it does not establish a specific variant or installed setup."
          : `Scope: variant ${plainMarkdown(document.variant_id!)} only; do not apply it to sibling variants or assume an installed setup.`,
      ].join("\n\n")
    })
  return [
    "Here are the current approved facts. Each source applies only to the named product and scope; it cannot establish claims about another product. Missing facts, including safety limits, remain unknown. These facts may not answer every part of your question.",
    ...sections,
    ...(documents.size > MAX_DOCUMENTS
      ? [
          "More evidence was returned; only four documents are shown. Please narrow the request.",
        ]
      : []),
    ...(unavailable
      ? ["Some evidence could not be validated and is not used here."]
      : []),
  ].join("\n\n")
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
      const output =
        execution.attempted || knowledgeToolSeen
          ? renderKnowledgeEvidence(execution)
          : tooLong
            ? TOO_LONG
            : text
      if (!output) return
      const id = "evidence-grounded-answer"
      controller.enqueue({ type: "text-start", id } as Part)
      controller.enqueue({ type: "text-delta", id, text: output } as Part)
      controller.enqueue({ type: "text-end", id } as Part)
      text = ""
    }
    const grounding = new TransformStream<Part, Part>({
      transform(chunk, controller) {
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
