/**
 * Workflow: Sync Products with CMS
 * 
 * Demonstrates:
 * - Batch processing workflow
 * - Syncing Medusa products with Strapi content
 * - Progress tracking
 * - Error aggregation
 */

import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { ModuleRegistrationName } from '@medusajs/utils';

interface SyncProductsInput {
  productIds?: string[];
  syncAll?: boolean;
}

interface SyncResult {
  success: string[];
  failed: Array<{ id: string; error: string }>;
  total: number;
}

/**
 * Step: Get products to sync
 */
const getProductsToSyncStep = createStep(
  'get-products-to-sync',
  async ({ productIds, syncAll }: SyncProductsInput, { container }) => {
    const productService = container.resolve(
      ModuleRegistrationName.PRODUCT
    );

    let products;

    if (syncAll) {
      // Fetch all products
      products = await productService.listProducts({});
    } else if (productIds && productIds.length > 0) {
      // Fetch specific products
      products = await productService.listProducts({
        id: productIds,
      });
    } else {
      throw new Error('Must specify productIds or syncAll');
    }

    return new StepResponse({ products: products.products || [] });
  }
);

/**
 * Step: Sync each product with CMS
 */
const syncProductsWithCMSStep = createStep(
  'sync-products-with-cms',
  async (input, { container }) => {
    const { products } = input;
    const strapiService = getStrapiService();

    const results: SyncResult = {
      success: [],
      failed: [],
      total: products.length,
    };

    // Sync each product
    for (const product of products) {
      try {
        // Check if product content exists in Strapi
        const { data } = await strapiService.client.findMany('product-contents', {
          filters: {
            productId: { $eq: product.id },
          },
        });

        if (data.length === 0) {
          // Create new content entry
          await strapiService.client.create('product-contents', {
            data: {
              productId: product.id,
              title: product.title,
              handle: product.handle,
              lastSyncedAt: new Date().toISOString(),
            },
          });
        } else {
          // Update existing content
          await strapiService.client.update(
            'product-contents',
            data[0].id,
            {
              data: {
                title: product.title,
                handle: product.handle,
                lastSyncedAt: new Date().toISOString(),
              },
            }
          );
        }

        results.success.push(product.id);
      } catch (error) {
        results.failed.push({
          id: product.id,
          error: error.message,
        });
      }
    }

    return new StepResponse(results);
  }
);

/**
 * Main workflow: Sync products with CMS
 */
export const syncProductsWorkflow = createWorkflow(
  'sync-products-with-cms',
  (input: SyncProductsInput) => {
    const productsData = getProductsToSyncStep(input);
    const syncResults = syncProductsWithCMSStep(productsData);

    return new WorkflowResponse<SyncResult>(syncResults);
  }
);