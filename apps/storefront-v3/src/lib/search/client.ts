import { MeiliSearch } from "meilisearch";

export const searchClient = new MeiliSearch({
  host: process.env.NEXT_PUBLIC_MEILISEARCH_HOST || "http://localhost:7700",
  apiKey: process.env.NEXT_PUBLIC_MEILISEARCH_API_KEY,
});

export const INDEX_PRODUCTS = "products";
export const INDEX_CATEGORIES = "categories";
export const INDEX_COLLECTIONS = "collections";
export const INDEX_BRANDS = "brands";
