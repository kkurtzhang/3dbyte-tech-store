/**
 * Meilisearch Types
 *
 * Type definitions for Meilisearch integration across the monorepo.
 * These types are shared between backend (indexing) and storefront (search).
 */
/**
 * Meilisearch search document structure
 * This represents the indexed product with enriched Strapi content
 */
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
        prices?: Array<{
            amount: number;
            currency_code: string;
        }>;
    }>;
    categories: string[];
    tags: string[];
    images: string[];
    collection_ids?: string[];
    type_ids?: string[];
    material_ids?: string[];
    detailed_description?: string;
    features?: string[];
    specifications?: Record<string, unknown>;
    seo_title?: string;
    seo_description?: string;
    meta_keywords?: string[];
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}
/**
 * Meilisearch module configuration
 */
export interface MeilisearchModuleConfig {
    host: string;
    apiKey: string;
    productIndexName: string;
    settings?: MeilisearchIndexSettings;
}
/**
 * Meilisearch index settings
 */
export interface MeilisearchIndexSettings {
    filterableAttributes: string[];
    sortableAttributes: string[];
    searchableAttributes: string[];
    displayedAttributes: string[];
    rankingRules: string[];
    typoTolerance?: boolean | object;
    faceting?: {
        maxValuesPerFacet?: number;
    };
    pagination?: {
        maxTotalHits?: number;
    };
}
/**
 * Meilisearch index type
 */
export type MeilisearchIndexType = "product";
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
/**
 * Meilisearch search response wrapper
 * Used for type-safe search results
 */
export interface MeilisearchSearchResponse<T = MeilisearchProductDocument> {
    hits: T[];
    estimatedTotalHits: number;
    limit: number;
    offset: number;
    processingTimeMs: number;
    query: string;
}
/**
 * Meilisearch search options
 */
export interface MeilisearchSearchOptions {
    limit?: number;
    offset?: number;
    filter?: string | string[];
    sort?: string[];
    facets?: string[];
}
//# sourceMappingURL=meilisearch.d.ts.map