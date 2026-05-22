import {
  INDEX_PRODUCT_DOCUMENTS,
  searchClient,
} from "@/lib/search/client";
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
    const result = await searchClient
      .index(INDEX_PRODUCT_DOCUMENTS)
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
