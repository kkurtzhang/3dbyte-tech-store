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
  // First, get the brand by handle to retrieve its id
  const brand = await getBrandByHandle(brandHandle);
  
  if (!brand || !brand.id) {
    return {
      hits: [],
      count: 0,
    };
  }

  const index = searchClient.index(INDEX_PRODUCTS);
  const response = await index.search("", {
    filter: `brand.id = "${brand.id}"`,
    limit: 100,
  });

  return {
    hits: response.hits,
    count: response.estimatedTotalHits,
  };
}
