import type { MeilisearchIndexSettings } from "@3dbyte-tech-store/shared-types";

// Product utilities
export { toMeilisearchDocument, type RegionForPricing } from "./product";

// Category utilities
export {
  toCategoryDocument,
  computeCategoryPath,
  computeParentName,
} from "./product";
export type { SyncCategoriesStepCategory } from "./product";

// Brand utilities
export { toBrandDocument } from "./brand";

/**
 * Default index settings for Meilisearch product index
 */
export const DEFAULT_INDEX_SETTINGS: MeilisearchIndexSettings = {
  filterableAttributes: [
    "price",
    "categories",
    "_tags",
    "status",
    "collection_ids",
    "type_ids",
    "material_ids",
    "brand.id",
    "brand.handle",
  ],
  sortableAttributes: [
    "price",
    "title",
    "created_at",
    "updated_at",
    "brand.name",
  ],
  searchableAttributes: [
    "title",
    "description",
    "rich_description",
    "features",
    "_tags",
    "categories",
    "brand.name",
  ],
  displayedAttributes: [
    "id",
    "title",
    "handle",
    "subtitle",
    "description",
    "thumbnail",
    "price",
    "currency_code",
    "categories",
    "_tags",
    "images",
    "brand",
    "rich_description",
    "features",
    "specifications",
    "status",
    "created_at",
    "updated_at",
  ],
  rankingRules: [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness",
    "created_at:desc",
  ],
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 4,
      twoTypos: 8,
    },
  },
  faceting: {
    maxValuesPerFacet: 100,
  },
  pagination: {
    maxTotalHits: 10000,
  },
} as const;
