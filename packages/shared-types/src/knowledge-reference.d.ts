export interface KnowledgeFact {
    field: string;
    label: string;
    value: string | null;
    evidence_excerpt: string;
    page?: number;
}
/** Absent scope is accepted only for legacy documents with an exact variant. */
export type KnowledgeBinding = {
    binding_scope: "product";
    variant_id: null;
} | {
    binding_scope?: "variant";
    variant_id: string;
};
export type KnowledgeDocumentBody = KnowledgeBinding & {
    version: 1;
    document_id: string;
    product_id: string;
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
};
export type ApprovedKnowledgeDocument = KnowledgeDocumentBody & {
    revision_hash: string;
    valid_until: string;
};
export type KnowledgeReferenceCard = ApprovedKnowledgeDocument & {
    scope: "staging";
    catalogue_role: "knowledge_reference";
    checkout_enabled: false;
    price: null;
    simulated_initial_quantity: number;
};
//# sourceMappingURL=knowledge-reference.d.ts.map