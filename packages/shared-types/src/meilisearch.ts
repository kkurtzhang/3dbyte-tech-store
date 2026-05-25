/**
 * Meilisearch Types
 *
 * Type definitions for Meilisearch integration across the monorepo.
 * These types are shared between backend (indexing) and storefront (search).
 */

import type { MeiliSearch } from "meilisearch" with { "resolution-mode": "import" };

export type MeilisearchClient = MeiliSearch;

export type MeilisearchIndexType =
  | "product"
  | "category"
  | "brand"
  | "address"
  | "locality"
  | "product_document";

export interface MeilisearchModuleConfig {
  host: string;
  apiKey: string;
  productIndexName: string;
  categoryIndexName: string;
  brandIndexName: string;
  addressIndexName: string;
  localityIndexName: string;
  productDocumentIndexName?: string;
  settings?: MeilisearchIndexSettings;
}

/**
 * Brand object nested within product documents
 */
export interface MeilisearchBrandObject {
  id: string;
  name: string;
  handle: string;
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
    disableOnWords?: string[];
    disableOnAttributes?: string[];
    disableOnNumbers?: boolean;
  };
  faceting?: {
    maxValuesPerFacet?: number;
  };
  pagination?: {
    maxTotalHits?: number;
  };
}

export const BRAND_INDEX_SETTINGS = {
  searchableAttributes: ["name", "meta_keywords", "rich_description", "handle"],
  displayedAttributes: ["id", "name", "handle", "brand_logo", "product_count"],
  filterableAttributes: ["product_count", "id"],
  sortableAttributes: ["product_count", "created_at", "name"],
  typoTolerance: {
    disableOnAttributes: ["handle"],
  },
} as const;

export interface AiProductMetadataSearchFields {
  tdp_schema_version?: number;
  tdp_product_kind?: string;
  tdp_material?: string;
  tdp_diameter_mm?: number;
  tdp_nozzle_temp_min_c?: number;
  tdp_nozzle_temp_max_c?: number;
  tdp_bed_temp_min_c?: number;
  tdp_bed_temp_max_c?: number;
  tdp_requires_enclosure?: boolean;
  tdp_requires_hardened_nozzle?: boolean;
  tdp_drying_recommended?: boolean;
  tdp_compatible_printers?: string[];
  tdp_compatible_build_surfaces?: string[];
  tdp_best_for?: string[];
  tdp_not_recommended_for?: string[];
  tdp_common_issues?: string[];
  tdp_ai_search_keywords?: string[];
  rcb_schema_version?: number;
  rcb_component_role?: string;
  rcb_compatible_project_types?: string[];
  rcb_voltage?: string;
  rcb_connector_type?: string;
  rcb_used_for?: string[];
  rcb_best_for?: string[];
  rcb_ai_search_keywords?: string[];
}

export interface MeilisearchProductDocument extends AiProductMetadataSearchFields {
  // --- 1. CORE IDENTITY ---
  id: string;
  title: string;
  handle: string;
  thumbnail?: string;
  created_at_timestamp: number;

  // --- 2. PRODUCT TYPE ---
  type_id?: string;
  type_value?: string;

  // --- 3. MULTI-CURRENCY PRICING ---
  // Dynamic keys: price_aud, price_usd, etc.
  [key: `price_${string}`]: number | undefined;
  // Dynamic keys: tax_inclusive_price_aud, tax_inclusive_price_usd, etc.
  [key: `tax_inclusive_price_${string}`]: boolean | undefined;
  on_sale: boolean;

  // --- 4. INVENTORY & AVAILABILITY ---
  inventory_quantity: number;
  in_stock: boolean;

  // --- 5. FACETS (Filtering) ---
  materials?: string[];
  // Dynamic keys: options_color, options_size, etc.
  [key: `options_${string}`]: string[] | undefined;

  // --- 6. NAVIGATION ---
  category_ids: string[];
  categories: string[];
  _tags: string[]; // Flattened tag values (not original tags object)
  collection_ids: string[];
  available_in_bundles_count?: number;
  available_in_bundles?: Array<{
    id: string;
    handle?: string;
    title?: string;
    thumbnail?: string;
  }>;

  // --- 7. BRAND ---
  brand?: {
    id: string;
    name: string;
    handle: string;
    logo?: string;
  };

  // --- 7B. BUNDLE DISCOVERY ---
  is_bundle: boolean;
  bundle_id?: string;
  bundle_item_count: number;
  bundle_item_titles: string[];

  // --- 8. SEARCHABLE CONTENT (Not in display payload ideally, but indexed) ---
  rich_description?: string;

  // --- 9. VARIANTS (SKU Search) ---
  variants: Array<{
    id: string;
    sku?: string;
    title: string;
  }>;
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
  display_path?: string; // Name of immediate parent category
  rank: number;
  breadcrumb: Array<{ id: string; name: string; handle: string }>; // All parent categories (excluding current)
  category_ids: string[]; // This category's ID and all parent IDs
  product_count: number;
  created_at: number; // UNIX timestamp in milliseconds
}

export interface MeilisearchBrandDocument {
  // Core Medusa fields
  id: string;
  name: string;
  handle: string;
  // Enriched from Strapi
  rich_description?: string;
  brand_logo?: string[];
  meta_keywords?: string[];
  // Calculated
  product_count: number;
  created_at: number; // UNIX timestamp in milliseconds
}

/**
 * Address document for Meilisearch indexing
 * Sourced from OpenAddresses (G-NAF countrywide for AU, LINZ for NZ)
 * Fields map directly to the OpenAddresses CSV flat format
 */
export interface MeilisearchAddressDocument {
  id: string;
  full_address: string;
  unit: string;
  number: string;
  street: string;
  suburb: string; // OpenAddresses "CITY" field = AU suburb
  state: string; // OpenAddresses "REGION" field = AU state abbreviation
  postcode: string;
  country: string; // "AU" or "NZ"
}

/**
 * Locality document for Meilisearch indexing
 * Sourced from unique OpenAddresses city/region/postcode combinations.
 */
export interface MeilisearchLocalityDocument {
  id: string;
  display_name: string;
  locality: string;
  state: string;
  postcode: string;
  country: string; // "AU" or "NZ"
}

export interface MeilisearchProductDocumentFile {
  id: string;
  medusa_product_id: string;
  product_handle: string;
  product_title: string;
  title: string;
  document_type:
    | "manual"
    | "datasheet"
    | "install_guide"
    | "safety_sheet"
    | "warranty"
    | "other";
  version?: string;
  language?: string;
  file_name: string;
  file_size: number;
  public_download_path: string;
  search_keywords: string[];
  sort_order: number;
  published_at_timestamp: number;
}

export interface MeilisearchSearchOptions {
  limit?: number;
  offset?: number;
  filter?: string | string[];
  sort?: string[];
  facets?: string[];
}

export interface MeilisearchSearchResponse<
  T =
    | MeilisearchProductDocument
    | MeilisearchCategoryDocument
    | MeilisearchProductDocumentFile,
> {
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
  metadata?: Record<string, unknown> | null;
  variants?: Array<{
    id: string;
    title?: string;
    sku?: string;
    manage_inventory?: boolean;
    inventory_items?: Array<{
      inventory_item_id: string;
      required_quantity: number;
      inventory?: {
        location_levels?: Array<{
          stocked_quantity: number;
          reserved_quantity: number;
        }>;
      };
    }>;
    options?: Array<{
      option_id?: string;
      option_title?: string;
      title?: string;
      value: string;
    }>;
    prices?: Array<{
      amount: number;
      currency_code: string;
      rules?: {
        region_id?: string;
      };
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
  brand?: {
    id: string;
    name: string;
    handle: string;
  } | null;
  bundle?: SyncProductsStepBundle | SyncProductsStepBundle[] | null;
}

export interface SyncProductsStepBundle {
  id: string;
  title?: string | null;
  items?: Array<{
    id: string;
    quantity: number;
    product?: {
      id: string;
      title?: string | null;
      handle?: string | null;
    } | null;
  }> | null;
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
  rich_description: string;
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
 * Brand type for workflow steps (matches useQueryGraphStep output)
 */
export interface SyncBrandsStepBrand {
  id: string;
  name: string;
  handle: string;
  created_at: string;
  updated_at: string;
}

/**
 * Strapi brand description response
 * Matches the Strapi brand-descriptions content type structure
 */
export interface StrapiBrandDescription {
  documentId: string;
  medusa_brand_id: string;
  brand_name: string;
  brand_handle: string;
  rich_description: string;
  brand_logo: Array<{
    url: string;
  }>;
  meta_keywords: string[];
  last_synced: string;
  sync_status: "synced" | "outdated" | "pending";
  publishedAt: string;
}
