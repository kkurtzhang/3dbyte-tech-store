import type {
  MeilisearchCategoryDocument,
  MeilisearchProductDocument,
  StrapiProductDescription,
  SyncProductsStepProduct,
} from "@3dbyte-tech-store/shared-types";

/**
 * Region type for pricing calculation
 */
export interface RegionForPricing {
  id: string;
  currency_code: string;
}

/**
 * Normalize option title to create consistent Meilisearch field keys
 *
 * @param title - The option title (e.g., "Color", "Size")
 * @returns Normalized key (e.g., "options_color", "options_size")
 *
 * @example
 * ```ts
 * normalizeOptionKey("Color") // Returns: "options_color"
 * normalizeOptionKey("Shoe Size") // Returns: "options_shoe_size"
 * ```
 */
function normalizeOptionKey(title: string): string {
  return `options_${title.toLowerCase().replace(/\s+/g, "_")}`;
}

/**
 * Transform Medusa product and Strapi content into a Meilisearch document
 *
 * This function merges product data from Medusa with enriched content from Strapi,
 * creating a flattened search document with multi-currency pricing and faceted options.
 *
 * @param product - Medusa product with variants, images, categories, tags
 * @param regions - List of active regions for multi-currency pricing
 * @param strapiContent - Enriched content from Strapi (optional)
 * @returns Formatted Meilisearch document
 */
export function toMeilisearchDocument(
  product: SyncProductsStepProduct,
  regions: RegionForPricing[],
  strapiContent?: StrapiProductDescription | null,
): MeilisearchProductDocument {
  // --- 1. CORE IDENTITY ---
  const created_at_timestamp = new Date(product.created_at).getTime();

  // --- 2. PRODUCT TYPE ---
  const type_id = product.type_id;
  const type_value = product.type_id; // We'll need to fetch this from DB separately

  // --- 3. MULTI-CURRENCY PRICING ---
  // Calculate lowest price for each region/currency
  const prices: Record<string, number> = {};
  let on_sale = false;

  regions.forEach((region) => {
    let minPrice = Infinity;
    let found = false;

    product.variants?.forEach((variant) => {
      // Find price for this region's currency and region
      const priceObj = variant.prices?.find(
        (p) =>
          (p.rules?.region_id === region.id ||
            (!p.rules?.region_id &&
              p.currency_code === region.currency_code)) &&
          p.amount !== undefined,
      );

      if (priceObj && priceObj.amount < minPrice) {
        minPrice = priceObj.amount;
        found = true;
      }

      // Check if any variant has a sale price
      if (
        variant.original_price_calculated &&
        variant.original_price_calculated < minPrice
      ) {
        on_sale = true;
      }
    });

    if (found) {
      prices[`price_${region.currency_code}`] = minPrice;
    }
  });

  // --- 4. INVENTORY & AVAILABILITY ---
  // Sum inventory across all variants
  const inventory_quantity =
    product.variants?.reduce(
      (sum, v) => sum + (v.inventory_quantity || 0),
      0,
    ) || 0;
  const in_stock = inventory_quantity > 0;

  // --- 5. FACETS (Option Flattening) ---
  // Aggregate all unique option values across variants
  const optionsMap: Record<string, Set<string>> = {};

  product.variants?.forEach((variant) => {
    variant.options?.forEach((opt) => {
      const key = normalizeOptionKey(opt.option_title || opt.title || "Option");
      if (!optionsMap[key]) {
        optionsMap[key] = new Set();
      }
      optionsMap[key].add(opt.value);
    });
  });

  // Convert Sets to Arrays and build dynamic options object
  const flattenedOptions: Record<string, string[]> = {};
  Object.entries(optionsMap).forEach(([key, values]) => {
    flattenedOptions[key] = Array.from(values);
  });

  // --- 6. NAVIGATION ---
  const category_ids = product.categories?.map((c) => c.id) || [];
  const categories = product.categories?.map((c) => c.name) || [];
  const tags = product.tags?.map((t) => t.value) || [];
  const collection_ids = product.collection_id ? [product.collection_id] : [];

  // --- 7. BRAND ---
  const brand = product.brand
    ? {
        id: product.brand.id,
        name: product.brand.name,
        handle: product.brand.handle,
        logo: undefined, // Can be populated from Strapi later
      }
    : undefined;

  // --- 8. SEARCHABLE CONTENT ---
  const detailed_description =
    strapiContent?.rich_description || product.description || undefined;

  // --- 9. VARIANTS (SKU Search) ---
  const variants = (product.variants || []).map((v) => ({
    id: v.id,
    sku: undefined, // Will be populated if SKU field exists
    title: v.title || v.options?.map((o) => o.value).join(" / ") || "",
  }));

  return {
    // 1. CORE IDENTITY
    id: product.id,
    title: product.title,
    handle: product.handle,
    thumbnail: product.thumbnail || undefined,
    created_at_timestamp,

    // 2. PRODUCT TYPE
    type_id,
    type_value,

    // 3. MULTI-CURRENCY PRICING
    ...prices,
    on_sale,

    // 4. INVENTORY & AVAILABILITY
    inventory_quantity,
    in_stock,

    // 5. FACETS (Flattened options via spread)
    ...flattenedOptions,

    // 6. NAVIGATION
    category_ids,
    categories,
    tags,
    collection_ids,

    // 7. BRAND
    brand,

    // 8. SEARCHABLE CONTENT
    detailed_description,

    // 9. VARIANTS
    variants,
  };
}

/**
 * Category type from Medusa query (matches useQueryGraphStep output)
 *
 * Note: Date fields accept string | Date to match Medusa's ProductCategory type
 * from useQueryGraphStep. This ensures type compatibility when passing data
 * between workflow steps.
 */
export interface SyncCategoriesStepCategory {
  id: string;
  name: string;
  handle: string;
  description?: string | null;
  parent_category_id?: string | null;
  parent_category?: SyncCategoriesStepCategory | null;
  rank: number;
  created_at: string | Date;
  updated_at: string | Date;
}

/**
 * Compute the full hierarchy path for a category
 * Traverses parent relationships to build the path array
 *
 * @param category - Category with optional parent_category
 * @returns Path array from root to current category
 *
 * @example
 * ```ts
 * computeCategoryPath({ name: "Shoes", parent_category: { name: "Men", parent_category: null } })
 * // Returns: ["Men", "Shoes"]
 * ```
 */
export function computeCategoryPath(
  category: SyncCategoriesStepCategory | null,
): string[] {
  if (!category) return [];

  const path: string[] = [];
  let current: SyncCategoriesStepCategory | null | undefined = category;

  // Traverse up the hierarchy
  while (current) {
    path.unshift(current.name);
    current = current.parent_category;
  }

  return path;
}

/**
 * Compute the breadcrumb string for a category's parent
 * Returns the full path from root to parent: "Apparel > Men > Clothing"
 * Returns null for root categories (no parent)
 *
 * @param category - Category with optional parent_category
 * @returns Breadcrumb string of parent's full path or null
 *
 * @example
 * ```ts
 * computeParentName({ name: "Shoes", parent_category: { name: "Clothing", parent_category: { name: "Men", parent_category: { name: "Apparel", parent_category: null } } } })
 * // Returns: "Apparel > Men > Clothing"
 *
 * computeParentName({ name: "Men", parent_category: { name: "Apparel", parent_category: null } })
 * // Returns: "Apparel"
 *
 * computeParentName({ name: "Apparel", parent_category: null })
 * // Returns: null
 * ```
 */
export function computeParentName(
  category: SyncCategoriesStepCategory | null,
): string | null {
  if (!category?.parent_category) return null;

  const parentPath = computeCategoryPath(category.parent_category);
  const breadcrumb = parentPath.join(" > ");

  return breadcrumb;
}

/**
 * Transform Medusa category into a Meilisearch document
 *
 * This function transforms a category from Medusa into a Meilisearch document
 * with computed breadcrumb hierarchy and category IDs for search and browse functionality.
 *
 * @param category - Category from Medusa with parent relationships
 * @param productCount - Number of active products in this category
 * @returns Formatted Meilisearch category document
 */
export function toCategoryDocument(
  category: SyncCategoriesStepCategory,
  productCount: number,
  breadcrumb?: Array<{ id: string; name: string; handle: string }>,
  category_ids?: string[],
): MeilisearchCategoryDocument {
  // Convert created_at to UNIX timestamp in milliseconds
  // Handles Date, string, or number (already a timestamp)
  let createdAt: number;
  if (category.created_at instanceof Date) {
    createdAt = category.created_at.getTime();
  } else if (typeof category.created_at === "string") {
    createdAt = new Date(category.created_at).getTime();
  } else if (typeof category.created_at === "number") {
    createdAt = category.created_at;
  } else {
    createdAt = Date.now();
  }

  // Generate display_path from breadcrumb (full path of parents)
  const display_path =
    breadcrumb && breadcrumb.length > 0
      ? breadcrumb.map((b) => b.name).join(" > ")
      : undefined;

  // Use provided breadcrumb and category_ids, or fall back to empty/single
  const finalBreadcrumb = breadcrumb || [];
  const finalCategoryIds = category_ids || [category.id];

  return {
    id: category.id,
    name: category.name,
    handle: category.handle,
    description: category.description || undefined,
    parent_category_id: category.parent_category_id || undefined,
    display_path,
    rank: category.rank,
    breadcrumb: finalBreadcrumb,
    category_ids: finalCategoryIds,
    product_count: productCount,
    created_at: createdAt,
  };
}
