/**
 * Meilisearch Types
 *
 * Type definitions for Meilisearch integration across the monorepo.
 * These types are shared between backend (indexing) and storefront (search).
 */
export const BRAND_INDEX_SETTINGS = {
    searchableAttributes: ["name", "meta_keywords", "rich_description", "handle"],
    displayedAttributes: ["id", "name", "handle", "brand_logo", "product_count"],
    filterableAttributes: ["product_count", "id"],
    sortableAttributes: ["product_count", "created_at", "name"],
    typoTolerance: {
        disableOnAttributes: ["handle"],
    },
};
//# sourceMappingURL=meilisearch.js.map