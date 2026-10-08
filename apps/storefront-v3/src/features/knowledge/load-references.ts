import type { KnowledgeReferenceCard } from "@3dbyte-tech-store/shared-types";
import {
  isKnowledgeRecord,
  parseApprovedKnowledgeDocument,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import { sdk } from "@/lib/medusa/client";

export async function loadReferencePage(offset: number) {
  const raw: unknown = await sdk.client.fetch(
    `/store/knowledge-references?offset=${offset}`,
    { method: "GET", cache: "no-store" },
  );
  if (
    !isKnowledgeRecord(raw) ||
    !Array.isArray(raw.references) ||
    raw.references.length > 4 ||
    (raw.next_offset !== null &&
      (typeof raw.next_offset !== "number" ||
        !Number.isInteger(raw.next_offset) ||
        raw.next_offset <= offset ||
        raw.next_offset > 5000))
  )
    throw new Error("Invalid reference response.");
  const references: KnowledgeReferenceCard[] = [];
  const ids = new Set<string>();
  for (const item of raw.references) {
    const doc = parseApprovedKnowledgeDocument(item);
    if (
      !doc ||
      !isKnowledgeRecord(item) ||
      item.scope !== "staging" ||
      item.catalogue_role !== "knowledge_reference" ||
      item.checkout_enabled !== false ||
      item.price !== null ||
      typeof item.simulated_initial_quantity !== "number" ||
      !Number.isInteger(item.simulated_initial_quantity) ||
      item.simulated_initial_quantity < 0 ||
      item.simulated_initial_quantity > 30 ||
      ids.has(doc.product_id)
    )
      throw new Error("Invalid reference response.");
    ids.add(doc.product_id);
    references.push({
      ...doc,
      scope: "staging",
      catalogue_role: "knowledge_reference",
      checkout_enabled: false,
      price: null,
      simulated_initial_quantity: item.simulated_initial_quantity,
    });
  }
  return { references, next_offset: raw.next_offset as number | null };
}
