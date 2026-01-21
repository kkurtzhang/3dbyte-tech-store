/**
 * Meilisearch Types
 *
 * Type definitions for Meilisearch integration across the monorepo.
 * These types are shared between backend (indexing) and storefront (search).
 */
import type { MeiliSearch } from "meilisearch" with { "resolution-mode": "import" };
export type MeilisearchClient = MeiliSearch;
export type MeilisearchIndexType = "product" | "category";
export interface MeilisearchModuleConfig {
    host: string;
    apiKey: string;
    productIndexName: string;
    categoryIndexName: string;
    settings?: MeilisearchIndexSettings;
}
export interface MeilisearchIndexSettings {
    filterableAttributes?: string[];
    sortableAttributes?: string[];
    searchableAttributes?: string[];
    displayedAttributes?: string[];
    rankingRules?: string[];
    typoTolerance?: {
        enabled?: boolean;
        minWordSizeForTypos?: {
            oneTypo?: number;
            twoTypos?: number;
        };
    };
    faceting?: {
        maxValuesPerFacet?: number;
    };
    pagination?: {
        maxTotalHits?: number;
    };
}
export interface MeilisearchProductDocument {
    id: string;
    title: string;
    handle: string;
    subtitle?: string;
    description?: string;
    thumbnail?: string;
    status: string;
    price: number;
    currency_code: string;
    variants: Array<{
        id: string;
        title: string;
        options: Record<string, string>;
        prices: Array<{
            amount: number;
            currency_code: string;
        }>;
    }>;
    categories: string[];
    tags: string[];
    images: string[];
    collection_ids: string[];
    type_ids: string[];
    material_ids: string[];
    detailed_description?: string;
    features?: string[];
    specifications?: Record<string, string>;
    seo_title?: string;
    seo_description?: string;
    meta_keywords?: string[];
    created_at: string;
    updated_at: string;
}
/**
 * Category document for Meilisearch indexing
 * Contains hierarchy information and computed product counts
 */
export interface MeilisearchCategoryDocument {
    id: string;
    name: string;
    handle: string;
    description?: string;
    parent_category_id?: string;
    display_path?: string;
    rank: number;
    breadcrumb: Array<{
        id: string;
        name: string;
        handle: string;
    }>;
    category_ids: string[];
    product_count: number;
    created_at: number;
}
export interface MeilisearchSearchOptions {
    limit?: number;
    offset?: number;
    filter?: string | string[];
    sort?: string[];
    facets?: string[];
}
export interface MeilisearchSearchResponse<T = MeilisearchProductDocument | MeilisearchCategoryDocument> {
    hits: T[];
    estimatedTotalHits: number;
    limit: number;
    offset: number;
    processingTimeMs: number;
    query: string;
}
export interface MeilisearchIndexStats {
    numberOfDocuments: number;
    isIndexing: boolean;
    fieldDistribution: Record<string, number>;
}
/**
 * Product type for workflow steps (matches useQueryGraphStep output)
 */
export interface SyncProductsStepProduct {
    id: string;
    title: string;
    handle: string;
    subtitle?: string | null;
    description?: string | null;
    thumbnail?: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    variants?: Array<{
        id: string;
        title?: string;
        options?: Array<{
            option_title?: string;
            title?: string;
            value: string;
        }>;
        prices?: Array<{
            amount: number;
            currency_code: string;
        }>;
        original_price?: number;
        original_price_calculated?: number;
    }>;
    images?: Array<{
        url: string;
    }>;
    categories?: Array<{
        id: string;
        name: string;
        handle: string;
    }>;
    tags?: Array<{
        id: string;
        value: string;
    }>;
    collection_id?: string;
    type_id?: string;
    material_id?: string;
    currency_code?: string;
}
/**
 * Strapi product description response
 * Matches the Strapi product-descriptions content type structure
 */
export interface StrapiProductDescription {
    documentId: string;
    medusa_product_id: string;
    product_title: string;
    product_handle: string;
    detailed_description: string;
    features: string[];
    specifications: Record<string, unknown>;
    seo_title: string;
    seo_description: string;
    meta_keywords: string[];
    last_synced: string;
    sync_status: "synced" | "outdated" | "pending";
    publishedAt: string;
}
//# sourceMappingURL=meilisearch.d.ts.map