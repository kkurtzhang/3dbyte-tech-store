import { MeiliSearch } from "meilisearch";

const getSearchHost = () => {
  if (typeof window === "undefined") {
    return (
      process.env.MEILISEARCH_SERVER_HOST ||
      process.env.NEXT_PUBLIC_MEILISEARCH_HOST ||
      "http://localhost:7700"
    );
  }

  return process.env.NEXT_PUBLIC_MEILISEARCH_HOST || "http://localhost:7700";
};

export const searchClient = new MeiliSearch({
  host: getSearchHost(),
  apiKey: process.env.NEXT_PUBLIC_MEILISEARCH_API_KEY,
});

export const INDEX_PRODUCTS = "products";
export const INDEX_CATEGORIES = "categories";
export const INDEX_COLLECTIONS = "collections";
export const INDEX_BRANDS = "brands";
export const INDEX_ADDRESSES = "addresses";
