import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { useQueryGraphStep } from "@medusajs/medusa/core-flows";
import { fetchProductOptionsStep } from "./steps/fetch-product-options";
import { syncProductsStep, SyncProductsStepInput } from "./steps/sync-products";
import { deleteProductsFromMeilisearchStep } from "./steps/delete-products-from-meilisearch";
import { fetchStrapiContentStep } from "./steps/fetch-strapi-content";
import type { SyncProductsStepProduct } from "@3dbyte-tech-store/shared-types";

export type SyncProductsWorkflowInput = {
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
};

export const syncProductsWorkflow = createWorkflow(
  "sync-products",
  ({ filters, limit, offset }: SyncProductsWorkflowInput) => {
    // Step 1: Fetch product options for correct option title mapping
    const optionTitleMap = fetchProductOptionsStep();

    // Step 2: Fetch products from Medusa using useQueryGraphStep
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
        "metadata",
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
        "variants.prices.*",
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
        "bundle.id",
        "bundle.title",
        "bundle.items.id",
        "bundle.items.quantity",
        "bundle.items.product.id",
        "bundle.items.product.title",
        "bundle.items.product.handle",
      ],
      pagination: {
        take: limit,
        skip: offset,
      },
      filters,
    });

    // Step 3: Use transform to separate published vs unpublished products
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

    // Step 4: Fetch Strapi content for enrichment (for published products only)
    const strapiContents = fetchStrapiContentStep({
      products: publishedProducts,
    });

    // Step 5: Sync published products to Meilisearch with Strapi enrichment and option title mapping
    const syncResult = syncProductsStep({
      products: publishedProducts,
      strapiContents,
      optionTitleMap,
    });

    // Step 6: Delete unpublished products from Meilisearch
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
