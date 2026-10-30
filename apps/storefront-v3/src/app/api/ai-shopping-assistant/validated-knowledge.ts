import type { ApprovedKnowledgeDocument } from "@3dbyte-tech-store/shared-types";
import { parseApprovedKnowledgeDocument } from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import type { KnowledgeExecution } from "./knowledge-execution";

/** Revalidate at the emission boundary; inconsistent duplicate identities poison the whole identity. */
export function currentKnowledge(
  execution: Pick<KnowledgeExecution, "results">,
  now: number,
) {
  const documents = new Map<string, ApprovedKnowledgeDocument>();
  const rejected = new Set<string>();
  let unavailable = false;
  let invalid = false;
  for (const result of Array.from(execution.results.values())) {
    if (!result) {
      unavailable = true;
      continue;
    }
    for (const raw of result.documents) {
      const document = parseApprovedKnowledgeDocument(raw, now);
      const previous = documents.get(raw.document_id);
      if (
        !document ||
        rejected.has(raw.document_id) ||
        (previous && JSON.stringify(previous) !== JSON.stringify(document))
      ) {
        documents.delete(raw.document_id);
        rejected.add(raw.document_id);
        invalid = true;
        continue;
      }
      documents.set(document.document_id, document);
    }
  }
  return { documents: Array.from(documents.values()), unavailable, invalid };
}
