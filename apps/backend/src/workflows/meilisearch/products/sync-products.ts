import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { useQueryGraphStep } from "@medusajs/medusa/core-flows";
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
    // Step 1: Fetch products from Medusa using useQueryGraphStep
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
        "variants.id",
        "variants.title",
        "variants.sku",
        "variants.inventory_quantity",
        "variants.options.option_title",
        "variants.options.title",
        "variants.options.value",
        "variants.prices.amount",
        "variants.prices.currency_code",
        "variants.prices.rules.region_id",
        "variants.original_price",
        "variants.original_price_calculated",
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

    // Step 2: Use transform to separate published vs unpublished products
    const { publishedProducts, unpublishedProductIds } = transform(
      { products },
      (data) => {
        const publishedProducts: SyncProductsStepInput["products"] = [];
        const unpublishedProductIds: string[] = [];

        (data.products as SyncProductsStepProduct[]).forEach((product) => {
          if (product.status === "published") {
            publishedProducts.push(product);
          } else {
            unpublishedProductIds.push(product.id);
          }
        });

        return { publishedProducts, unpublishedProductIds };
      },
    );

    // Step 3: Fetch Strapi content for enrichment (for published products only)
    const strapiContents = fetchStrapiContentStep({
      products: publishedProducts,
    });

    // Step 4: Sync published products to Meilisearch with Strapi enrichment
    const syncResult = syncProductsStep({
      products: publishedProducts,
      strapiContents,
    });

    // Step 5: Delete unpublished products from Meilisearch
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
