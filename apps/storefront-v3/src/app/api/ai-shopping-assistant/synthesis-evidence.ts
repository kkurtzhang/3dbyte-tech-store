import type {
  ApprovedKnowledgeDocument,
  KnowledgeFact,
} from "@3dbyte-tech-store/shared-types";
import { currentKnowledge } from "./validated-knowledge";
import { knowledgeSources } from "./knowledge-summary";
import type { KnowledgeExecution } from "./knowledge-execution";

export type SynthesisFact = {
  id: string;
  documentId: string;
  revision: string;
  fact: KnowledgeFact;
};
export type SynthesisPacket = {
  productKey: "p1";
  product: {
    title: string;
    productId: string;
    bindingScope: string;
    variantId: string | null;
  };
  documents: ApprovedKnowledgeDocument[];
  facts: SynthesisFact[];
};
/** v1 deliberately excludes ambiguous/multi-product scope and any incomplete retrieval. */
export function synthesisEvidence(
  execution: KnowledgeExecution,
  now: number,
): SynthesisPacket | null {
  const { documents, invalid, unavailable } = currentKnowledge(execution, now);
  if (
    invalid ||
    unavailable ||
    !documents.length ||
    documents.length > 4 ||
    Array.from(execution.outcomes.values()).some((v) => v !== "available")
  )
    return null;
  const first = documents[0];
  const identity = (d: ApprovedKnowledgeDocument) =>
    JSON.stringify([
      d.product_id,
      d.product_title,
      d.binding_scope ?? "variant",
      d.variant_id,
    ]);
  if (documents.some((d) => identity(d) !== identity(first))) return null;
  const fields = new Map<string, string | null>();
  const facts: SynthesisFact[] = [];
  for (const document of documents)
    for (const fact of document.facts) {
      if (fields.has(fact.field) && fields.get(fact.field) !== fact.value)
        return null;
      fields.set(fact.field, fact.value);
      facts.push({
        id: `f${facts.length + 1}`,
        documentId: document.document_id,
        revision: document.revision_hash,
        fact,
      });
    }
  if (!facts.some((f) => f.fact.value !== null)) return null;
  const packet: SynthesisPacket = {
    productKey: "p1",
    product: {
      title: first.product_title,
      productId: first.product_id,
      bindingScope: first.binding_scope ?? "variant",
      variantId: first.variant_id,
    },
    documents,
    facts,
  };
  // Never truncate source qualifications to fit the budget.
  return Buffer.byteLength(JSON.stringify(packet), "utf8") <= 18_000
    ? packet
    : null;
}
export function synthesisSources(
  packet: SynthesisPacket,
  ids: readonly string[],
) {
  const used = new Set(ids);
  return knowledgeSources(
    packet.documents.map((d) => ({
      ...d,
      facts: packet.facts
        .filter((f) => f.documentId === d.document_id && used.has(f.id))
        .map((f) => f.fact),
    })),
    "all facts",
  );
}
