import { MeiliSearch } from "meilisearch";
import type {
  ProductDocumentType,
  PublicProductDocument,
} from "./types";

interface SearchPublicProductDocumentsInput {
  query?: string;
  type?: ProductDocumentType | string;
  productHandle?: string;
  limit?: number;
}

const envValue = (name: string) => process.env[name];

const getProductDocumentIndexName = () =>
  envValue("NEXT_PUBLIC_MEILISEARCH_PRODUCT_DOCUMENT_INDEX_NAME") ||
  "product_documents_public";

const getProductDocumentSearchClient = () =>
  new MeiliSearch({
    host:
      envValue("MEILISEARCH_SERVER_HOST") ||
      envValue("NEXT_PUBLIC_MEILISEARCH_HOST") ||
      "http://localhost:7700",
    apiKey: envValue("NEXT_PUBLIC_MEILISEARCH_API_KEY"),
  });

export async function searchPublicProductDocuments({
  query = "",
  type,
  productHandle,
  limit = 24,
}: SearchPublicProductDocumentsInput): Promise<{
  documents: PublicProductDocument[];
  total: number;
}> {
  const filter = [
    type ? `document_type = "${type}"` : null,
    productHandle ? `product_handle = "${productHandle}"` : null,
  ].filter((item): item is string => Boolean(item));
  try {
    const result = await getProductDocumentSearchClient()
      .index(getProductDocumentIndexName())
      .search<PublicProductDocument>(query, {
        limit,
        filter,
        sort: ["sort_order:asc", "title:asc"],
      });

    return {
      documents: result.hits,
      total: result.estimatedTotalHits ?? result.hits.length,
    };
  } catch {
    return {
      documents: [],
      total: 0,
    };
  }
}
