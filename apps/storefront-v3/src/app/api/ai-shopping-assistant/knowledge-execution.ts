import type { ApprovedKnowledgeDocument } from "@3dbyte-tech-store/shared-types"
import {
  isKnowledgeRecord,
  parseApprovedKnowledgeDocument,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs"

export type KnowledgeInput = {
  query: string
  product_id?: string
  variant_id?: string
  limit?: number
}
export type KnowledgeResult = {
  documents: ApprovedKnowledgeDocument[]
  citations: ReturnType<typeof citationFor>[]
}
export type KnowledgeExecution = ReturnType<typeof createKnowledgeExecution>

function citationFor(document: ApprovedKnowledgeDocument) {
  return {
    document_id: document.document_id,
    product_id: document.product_id,
    binding_scope: document.binding_scope ?? "variant",
    variant_id: document.variant_id,
    title: document.document_title,
    source_url: document.source_url,
    source_sha256: document.source_sha256,
    source_version: document.source_version,
    source_checked_at: document.source_checked_at,
    revision_hash: document.revision_hash,
    valid_until: document.valid_until,
  }
}

/** Validate only the current authenticated backend response, never model/history parts. */
export function validateKnowledgeResult(
  raw: unknown,
  input: KnowledgeInput,
  now: number,
): KnowledgeResult | null {
  if (
    !isKnowledgeRecord(raw) ||
    !Array.isArray(raw.documents) ||
    !Array.isArray(raw.citations) ||
    raw.documents.length > Math.min(input.limit ?? 4, 4) ||
    raw.citations.length !== raw.documents.length ||
    "error" in raw
  )
    return null
  const documents: ApprovedKnowledgeDocument[] = []
  const ids = new Set<string>()
  for (const item of raw.documents) {
    const document = parseApprovedKnowledgeDocument(item, now)
    if (
      !document ||
      ids.has(document.document_id) ||
      (input.product_id && input.product_id !== document.product_id) ||
      (input.variant_id &&
        document.variant_id !== null &&
        input.variant_id !== document.variant_id)
    )
      return null
    const expected = citationFor(document)
    const matches = raw.citations.filter(
      (citation) =>
        isKnowledgeRecord(citation) &&
        Object.entries(expected).every(
          ([key, value]) => citation[key] === value,
        ),
    )
    if (matches.length !== 1) return null
    ids.add(document.document_id)
    documents.push(document)
  }
  return { documents, citations: documents.map(citationFor) }
}

export function createKnowledgeExecution(
  call: (input: KnowledgeInput) => Promise<unknown>,
  now: () => number = Date.now,
) {
  const results = new Map<string, KnowledgeResult | null>()
  let attempted = false
  return {
    results,
    get attempted() {
      return attempted
    },
    execute: async (
      input: KnowledgeInput,
      { toolCallId }: { toolCallId: string },
    ) => {
      attempted = true
      // The route allows five model steps. Keep this independent bound as well.
      if (results.has(toolCallId) || results.size >= 5) {
        return { error: "Knowledge lookup limit reached." }
      }
      results.set(toolCallId, null)
      try {
        const result = validateKnowledgeResult(await call(input), input, now())
        results.set(toolCallId, result)
        return (
          result ?? {
            error: "Current approved evidence could not be verified.",
          }
        )
      } catch {
        return { error: "Current approved evidence is unavailable." }
      }
    },
  }
}
