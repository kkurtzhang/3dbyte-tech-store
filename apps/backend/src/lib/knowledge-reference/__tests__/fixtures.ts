import type { ApprovedKnowledgeDocument } from "@3dbyte-tech-store/shared-types";
export const { knowledgeRevision, approvedKnowledgeDocument } =
  require("../../../../../cms/src/api/product-document/utils/knowledge-reference") as {
    knowledgeRevision: (record: unknown) => string | null;
    approvedKnowledgeDocument: (
      record: unknown,
      now?: number,
    ) => ApprovedKnowledgeDocument | null;
  };
import { bindKnowledgeReference } from "../contract";
export const now = Date.parse("2026-10-08T12:00:00Z");
export const document = () => ({
  documentId: "doc_hotend",
  medusa_product_id: "prod_hotend",
  product_handle: "hotend-2024",
  product_title: "2024 Hotend",
  title: "Manufacturer reference",
  source_url: "https://manufacturer.example/hotend",
  source_kind: "official_product_page",
  source_checked_at: "2026-10-08T10:00:00Z",
  version: "2024-kit",
  is_public: true,
  publishedAt: "2026-10-08T11:00:00Z",
  knowledge_content: {
    version: 1,
    variant_id: "variant_hotend",
    source_sha256: "a".repeat(64),
    text: "Compatible with Printer One.",
    facts: [
      {
        field: "compatible_printers",
        label: "Compatible printers",
        value: "Printer One",
        evidence_excerpt: "Compatible with Printer One.",
      },
      {
        field: "max_temperature_c",
        label: "Maximum operating temperature",
        value: null,
        evidence_excerpt: "",
      },
    ],
  },
  knowledge_review: {
    status: "approved",
    document_id: "doc_hotend",
    product_id: "prod_hotend",
    variant_id: "variant_hotend",
    revision_hash: "",
    reviewed_at: "2026-10-08T11:00:00Z",
    valid_until: "2026-10-20T00:00:00Z",
  },
});
export function approved() {
  const d = document();
  d.knowledge_review.revision_hash = knowledgeRevision(d)!;
  return d;
}
export function product() {
  return {
    id: "prod_hotend",
    title: "2024 Hotend",
    handle: "hotend-2024",
    status: "draft",
    metadata: {},
    variants: [{ id: "variant_hotend", price_set: { prices: [] } }],
  };
}
export function marked() {
  const d = approvedKnowledgeDocument(approved(), now)!;
  const p = product();
  return {
    ...p,
    metadata: {
      ...bindKnowledgeReference(p, d, "staging"),
      catalogue_simulation: {
        version: 1,
        scope: "staging",
        real_stock: false,
        product_id: p.id,
        variant_id: "variant_hotend",
        initial_quantity: 0,
      },
    },
  };
}
