import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { useQueryGraphStep } from "@medusajs/medusa/core-flows";
import { fetchProductOptionsStep } from "./steps/fetch-product-options";
import { syncIndexSettingsStep } from "./steps/sync-index-settings";
import { syncProductsStep, SyncProductsStepInput } from "./steps/sync-products";
import { deleteProductsFromMeilisearchStep } from "./steps/delete-products-from-meilisearch";
import { fetchStrapiContentStep } from "./steps/fetch-strapi-content";
import type { SyncProductsStepProduct } from "@3dbyte-tech-store/shared-types";

export type SyncProductsWithSettingsWorkflowInput = {
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
};

/**
 * Workflow to sync products to Meilisearch with up-to-date index settings
 *
 * This workflow ensures that the Meilisearch index settings are always
 * current before syncing products. This is important for:
 * - New product options becoming filterable
 * - New regions getting price_* attributes added
 *
 * Difference from sync-products workflow:
 * - sync-products: Only syncs documents, assumes settings are already current
 * - sync-products-with-settings: Always syncs settings first, then documents
 *
 * Use cases:
 * - Manual sync via admin panel (ensures settings are applied)
 * - Scheduled full sync (ensures everything is up-to-date)
 */
export const syncProductsWithSettingsWorkflow = createWorkflow(
  "sync-products-with-settings",
  ({ filters, limit, offset }: SyncProductsWithSettingsWorkflowInput) => {
    // Step 1: Sync index settings BEFORE indexing documents
    // This ensures filterable/sortable attributes are current
    const settingsResult = syncIndexSettingsStep({ type: "product" });

    // Step 2: Fetch product options for correct option title mapping
    const optionTitleMap = fetchProductOptionsStep();

    // Step 3: Fetch products from Medusa using useQueryGraphStep
    const { data: products, metadata } = useQueryGraphStep({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "subtitle",
        "description",
        "thumbnail",
        "status",
        "created_at",
        "updated_at",
        "collection_id",
        "type_id",
        "material_id",
        "currency_code",
        // Variants with inventory items relation
        "variants.id",
        "variants.title",
        "variants.sku",
        "variants.manage_inventory",
        "variants.options.option_id",
        "variants.options.title",
        "variants.options.value",
        "variants.prices.amount",
        "variants.prices.currency_code",
        "variants.original_price",
        "variants.original_price_calculated",
        // Inventory items for quantity calculation
        "variants.inventory_items.inventory_item_id",
        "variants.inventory_items.required_quantity",
        "variants.inventory_items.inventory.location_levels.*",
        "images.url",
        "categories.id",
        "categories.name",
        "categories.handle",
        "tags.id",
        "tags.value",
        "brand.id",
        "brand.name",
        "brand.handle",
      ],
      pagination: {
        take: limit,
        skip: offset,
      },
      filters,
    });

    // Step 4: Use transform to separate published vs unpublished products
    const { publishedProducts, unpublishedProductIds } = transform(
      { products },
      (data) => {
        const publishedProducts: SyncProductsStepInput["products"] = [];
        const unpublishedProductIds: string[] = [];

        const productsArray = data.products as unknown as SyncProductsStepProduct[];

        productsArray.forEach((product) => {
          if (product.status === "published") {
            publishedProducts.push(product);
          } else {
            unpublishedProductIds.push(product.id);
          }
        });

        return { publishedProducts, unpublishedProductIds };
      },
    );

    // Step 5: Fetch Strapi content for enrichment (for published products only)
    const strapiContents = fetchStrapiContentStep({
      products: publishedProducts,
    });

    // Step 6: Sync published products to Meilisearch with Strapi enrichment and option title mapping
    const syncResult = syncProductsStep({
      products: publishedProducts,
      strapiContents,
      optionTitleMap,
    });

    // Step 7: Delete unpublished products from Meilisearch
    deleteProductsFromMeilisearchStep({
      ids: unpublishedProductIds,
    });

    return new WorkflowResponse({
      indexed: syncResult.indexed,
      products,
      metadata,
    });
  },
);
