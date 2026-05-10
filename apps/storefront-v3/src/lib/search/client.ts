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

export const INDEX_PRODUCTS =
  process.env.NEXT_PUBLIC_MEILISEARCH_PRODUCT_INDEX_NAME ||
  process.env.NEXT_PUBLIC_MEILISEARCH_INDEX_NAME ||
  "products";
export const INDEX_CATEGORIES =
  process.env.NEXT_PUBLIC_MEILISEARCH_CATEGORY_INDEX_NAME || "categories";
export const INDEX_COLLECTIONS =
  process.env.NEXT_PUBLIC_MEILISEARCH_COLLECTION_INDEX_NAME || "collections";
export const INDEX_BRANDS =
  process.env.NEXT_PUBLIC_MEILISEARCH_BRAND_INDEX_NAME || "brands";
export const INDEX_BLOG =
  process.env.NEXT_PUBLIC_MEILISEARCH_BLOG_INDEX_NAME || "blog";
export const INDEX_ADDRESSES = "addresses";
