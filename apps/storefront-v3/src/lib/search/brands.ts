import { searchClient, INDEX_BRANDS, INDEX_PRODUCTS } from "./client";
import { Brand } from "@3dbyte-tech-store/shared-types";

export interface SearchBrandsParams {
  q?: string;
  limit?: number;
  offset?: number;
}

export async function searchBrands({
  q = "",
  limit = 20,
  offset = 0,
}: SearchBrandsParams = {}) {
  const index = searchClient.index(INDEX_BRANDS);

  const response = await index.search(q, {
    limit,
    offset,
  });

  return {
    hits: response.hits as Brand[],
    count: response.estimatedTotalHits,
  };
}

export async function getBrandByHandle(handle: string): Promise<Brand | null> {
  const index = searchClient.index(INDEX_BRANDS);
  const response = await index.search("", {
    filter: `handle = "${handle}"`,
    limit: 1,
  });

  if (response.hits.length === 0) {
    return null;
  }

  return response.hits[0] as Brand;
}

export async function getProductsByBrand(brandHandle: string) {
  const index = searchClient.index(INDEX_PRODUCTS);
  // Assuming the product document has a 'brand.handle' or 'brand_handle' field
  // Based on standard Meilisearch nesting, it might be 'brand.handle'
  const response = await index.search("", {
    filter: `brand.handle = "${brandHandle}"`,
    limit: 100,
  });

  return {
    hits: response.hits,
    count: response.estimatedTotalHits,
  };
}
