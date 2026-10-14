import { knowledgeIdentifier } from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import { verifiedReferenceDocument } from "../../lib/knowledge-reference/contract";
import {
  knowledgeMatchesMetadata,
  type DocumentReadOptions,
  type KnowledgeProductDocument,
} from "../../lib/product-document-knowledge/contract";
import { z } from "@medusajs/framework/zod";
import { normalizeStrapiProductDocument } from "../product-files/utils/public-documents";

const pageSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())).max(200),
  meta: z.object({
    pagination: z.object({
      page: z.number().int().min(1).max(100),
      pageSize: z.number().int().min(1).max(200),
      pageCount: z.number().int().min(0).max(100),
      total: z.number().int().min(0).max(20_000),
    }),
  }),
});

/** Bounded pages reject partial reads; callers must recheck absence before deletion. */
export async function readPublicProductDocuments(
  request: (endpoint: string) => Promise<unknown>,
  medusaProductId?: string,
  options: DocumentReadOptions = {},
): Promise<KnowledgeProductDocument[]> {
  if (
    options.documentId !== undefined &&
    !knowledgeIdentifier(options.documentId)
  )
    throw new Error("Invalid document scope.");
  const projection = options.includeKnowledge ? "&knowledge=approved" : "";
  const scope = options.documentId
    ? `&filters[documentId][$eq]=${encodeURIComponent(options.documentId)}`
    : "";
  const filter = medusaProductId
    ? `&filters[medusa_product_id][$eq]=${encodeURIComponent(medusaProductId)}`
    : "";
  const documents: KnowledgeProductDocument[] = [];
  const ids = new Set<string>();
  let snapshot:
    | { total: number; pageSize: number; pageCount: number }
    | undefined;

  for (let page = 1; page <= 100; page++) {
    const response = pageSchema.parse(
      await request(
        `product-documents?populate[file]=true&status=published&filters[is_public][$eq]=true${filter}${scope}${projection}&sort[0]=sort_order:asc&sort[1]=title:asc&sort[2]=documentId:asc&pagination[pageSize]=${options.includeKnowledge ? 25 : 200}&pagination[page]=${page}&pagination[withCount]=true`,
      ),
    );
    const pagination = response.meta.pagination;
    const { total, pageSize, pageCount } = pagination;
    if (options.includeKnowledge && total > 2000)
      throw new Error("Knowledge document snapshot exceeds 2000 documents.");
    snapshot ||= { total, pageSize, pageCount };
    if (
      pagination.page !== page ||
      pageCount !== Math.ceil(total / pageSize) ||
      total !== snapshot.total ||
      pageSize !== snapshot.pageSize ||
      pageCount !== snapshot.pageCount ||
      response.data.length !==
        Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize))
    )
      throw new Error(
        "Incomplete or changing CMS document snapshot; retry reconciliation.",
      );

    for (const raw of response.data) {
      const document = normalizeStrapiProductDocument(raw);
      if (!document.id || ids.has(document.id)) {
        throw new Error(
          "Missing or repeated CMS document identity; retry reconciliation.",
        );
      }
      ids.add(document.id);
      if (options.documentId && document.id !== options.documentId)
        throw new Error("CMS returned a document outside the requested scope.");
      const approved = options.includeKnowledge
        ? verifiedReferenceDocument(raw.approved_knowledge)
        : null;
      if (document.file_url || document.source_url)
        documents.push({
          ...document,
          ...(approved && knowledgeMatchesMetadata(approved, document)
            ? { approved_knowledge: approved }
            : {}),
        });
    }
    if (page >= pageCount) return documents;
  }
  throw new Error(
    "CMS document snapshot exceeds the bounded pagination limit.",
  );
}
