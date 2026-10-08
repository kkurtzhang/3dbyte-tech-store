export interface KnowledgeFact {
  field: string;
  label: string;
  value: string | null;
  evidence_excerpt: string;
  page?: number;
}
export interface KnowledgeDocumentBody {
  version: 1;
  document_id: string;
  product_id: string;
  variant_id: string;
  product_handle: string;
  product_title: string;
  document_title: string;
  source_url: string;
  source_kind: string;
  source_sha256: string;
  source_version: string;
  source_checked_at: string;
  text: string;
  facts: KnowledgeFact[];
}
export interface ApprovedKnowledgeDocument extends KnowledgeDocumentBody {
  revision_hash: string;
  valid_until: string;
}
export interface KnowledgeReferenceCard extends ApprovedKnowledgeDocument {
  scope: "staging";
  catalogue_role: "knowledge_reference";
  checkout_enabled: false;
  price: null;
  simulated_initial_quantity: number;
}
