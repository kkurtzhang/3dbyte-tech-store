import type { ApprovedKnowledgeDocument } from "@3dbyte-tech-store/shared-types";

import { plainMarkdown } from "./grounded-text";
import { selectKnowledgeFacts } from "./knowledge-fact-selection";

type Fact = ApprovedKnowledgeDocument["facts"][number];

function scopeKey(document: ApprovedKnowledgeDocument) {
  return JSON.stringify([
    document.product_id,
    document.binding_scope,
    document.variant_id,
  ]);
}

function scopeLabel(document: ApprovedKnowledgeDocument) {
  return document.binding_scope === "product"
    ? "model-level"
    : `variant ${document.variant_id}`;
}

/** A presentation cap must never conceal a contradiction to a displayed field. */
export function includeConflictingEvidence(
  selected: ApprovedKnowledgeDocument[],
  documents: ApprovedKnowledgeDocument[],
  question: string,
) {
  const fields = new Map<string, Set<string | null>>();
  const keyFor = (document: ApprovedKnowledgeDocument, fact: Fact) =>
    JSON.stringify([scopeKey(document), fact.field]);
  for (const document of selected)
    for (const fact of selectKnowledgeFacts(document, question)) {
      const key = keyFor(document, fact);
      const values = fields.get(key) ?? new Set<string | null>();
      fields.set(key, new Set([...Array.from(values), fact.value]));
    }
  const selectedIds = new Set(selected.map((document) => document.document_id));
  return [
    ...selected,
    ...documents.filter(
      (document) =>
        !selectedIds.has(document.document_id) &&
        selectKnowledgeFacts(document, question).some((fact) => {
          const values = fields.get(keyFor(document, fact));
          return (
            values && Array.from(values).some((value) => value !== fact.value)
          );
        }),
    ),
  ];
}

/** Compose only approved values; no free-form model claims cross this boundary. */
export function summarizeKnowledge(
  documents: ApprovedKnowledgeDocument[],
  question: string,
  evidenceDocuments = documents,
) {
  const groups = new Map<string, ApprovedKnowledgeDocument[]>();
  for (const document of documents) {
    const key = scopeKey(document);
    groups.set(key, [...(groups.get(key) ?? []), document]);
  }
  return Array.from(groups.values()).map((group) => {
    const document = group[0];
    const ordered = group.flatMap((item) =>
      selectKnowledgeFacts(item, question),
    );
    const fields = new Map<string, Fact[]>();
    for (const fact of ordered)
      fields.set(fact.field, [...(fields.get(fact.field) ?? []), fact]);
    for (const evidence of evidenceDocuments.filter(
      (item) => scopeKey(item) === scopeKey(document),
    )) {
      for (const fact of selectKnowledgeFacts(evidence, question)) {
        const displayed = fields.get(fact.field);
        if (displayed) fields.set(fact.field, [...displayed, fact]);
      }
    }
    const known: Fact[] = [];
    const unknown: string[] = [];
    const conflicts: string[] = [];
    for (const facts of Array.from(fields.values())) {
      const values = new Set(facts.map((fact) => fact.value));
      if (values.size > 1) conflicts.push(facts[0].label);
      else if (facts[0].value === null) unknown.push(facts[0].label);
      else known.push(facts[0]);
    }
    const statements = Array.from(
      new Set(
        known.map((fact) => {
          const value = fact.value!.trim();
          // Complete approved sentences already carry their meaning. Scalar values
          // need their field label; do not rewrite values, links or code in either case.
          return value.split(/\s+/).length >= 5 && /[.!?]$/.test(value)
            ? plainMarkdown(value)
            : `${plainMarkdown(fact.label)}: ${plainMarkdown(value)}.`;
        }),
      ),
    ).join(" ");
    const limitations = [
      ...(conflicts.length
        ? [
            `**Conflicting evidence:** ${conflicts.map(plainMarkdown).join(", ")}. These facts remain unknown; I cannot choose between the returned sources.`,
          ]
        : []),
      ...(unknown.length
        ? [
            `**Not established:** ${unknown.map(plainMarkdown).join(", ")}. These facts remain unknown; this evidence cannot confirm them.`,
          ]
        : []),
    ].join("\n\n");
    const unresolvedLimit = ordered.some(
      (fact) =>
        fact.field === "installed_max_temperature" &&
        (fact.value === null || conflicts.includes(fact.label)),
    );
    return [
      `### ${plainMarkdown(document.product_title)}`,
      ...(ordered[0]?.value === null || conflicts.length
        ? [limitations, statements]
        : [statements, limitations]),
      document.binding_scope === "product"
        ? "Scope: model-level evidence only; it does not establish a specific variant or installed setup."
        : `Scope: variant ${plainMarkdown(document.variant_id!)} only; do not apply it to sibling variants or assume an installed setup.`,
      ...(unresolvedLimit
        ? [
            "A component rating does not verify an installed printer's operating limit. The heater, sensor, wiring and firmware requirements remain unknown unless explicitly established above.",
          ]
        : []),
    ]
      .filter(Boolean)
      .join("\n\n");
  });
}

/** Captions retain product/scope/field attribution beside the final source link.
 * Exact document/revision identities remain in the validated tool result.
 */
export function knowledgeSources(
  documents: ApprovedKnowledgeDocument[],
  question: string,
) {
  const sources = new Map<
    string,
    { sourceType: "url"; id: string; url: string; title: string }
  >();
  for (const document of documents) {
    const facts = selectKnowledgeFacts(document, question);
    const known = facts
      .filter((fact) => fact.value !== null)
      .map((fact) => fact.label);
    const unknown = facts
      .filter((fact) => fact.value === null)
      .map((fact) => fact.label);
    const title = [
      `${document.document_title}${document.document_title.includes(document.product_title) ? "" : ` — ${document.product_title}`} (${scopeLabel(document)})`,
      ...(known.length ? [`Fields: ${known.join(", ")}`] : []),
      ...(unknown.length && !known.length
        ? [`Not established: ${unknown.join(", ")}`]
        : []),
    ].join("; ");
    const previous = sources.get(document.source_url);
    sources.set(
      document.source_url,
      previous
        ? { ...previous, title: `${previous.title} / ${title}` }
        : {
            sourceType: "url",
            id: `knowledge-${document.document_id}-${document.revision_hash}`,
            url: document.source_url,
            title,
          },
    );
  }
  return Array.from(sources.values());
}
