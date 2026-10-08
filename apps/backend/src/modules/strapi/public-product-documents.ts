import { z } from "@medusajs/framework/zod";
import {
  normalizeStrapiProductDocument,
  type PublicProductDocument,
} from "../product-files/utils/public-documents";

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

/** Reconciliation needs a complete snapshot: never return a successful prefix. */
export async function readPublicProductDocuments(
  request: (endpoint: string) => Promise<unknown>,
  medusaProductId?: string,
): Promise<PublicProductDocument[]> {
  const filter = medusaProductId
    ? `&filters[medusa_product_id][$eq]=${encodeURIComponent(medusaProductId)}`
    : "";
  const documents: PublicProductDocument[] = [];
  const ids = new Set<string>();
  let snapshot:
    | { total: number; pageSize: number; pageCount: number }
    | undefined;

  for (let page = 1; page <= 100; page++) {
    const response = pageSchema.parse(
      await request(
        `product-documents?populate[file]=true&status=published&filters[is_public][$eq]=true${filter}&sort[0]=sort_order:asc&sort[1]=title:asc&sort[2]=documentId:asc&pagination[pageSize]=200&pagination[page]=${page}&pagination[withCount]=true`,
      ),
    );
    const pagination = response.meta.pagination;
    const { total, pageSize, pageCount } = pagination;
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
      if (document.file_url || document.source_url) documents.push(document);
    }
    if (page >= pageCount) return documents;
  }
  throw new Error(
    "CMS document snapshot exceeds the bounded pagination limit.",
  );
}
