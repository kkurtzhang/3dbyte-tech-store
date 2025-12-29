/**
 * Event Subscriber: Product Updated
 * 
 * Demonstrates:
 * - Listening to Medusa events
 * - Triggering CMS updates
 * - Async event handling
 */

import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa';
import { getStrapiService } from '../integrations/strapi-service';

/**
 * Subscribe to product.updated event
 * Sync updated product data to Strapi CMS
 */
export default async function productUpdatedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = event.data.id;

  try {
    // Get product details
    const productService = container.resolve('productService');
    const product = await productService.retrieve(productId);

    // Update in Strapi
    const strapiService = getStrapiService();
    
    // Find existing product content
    const { data } = await strapiService.client.findMany('product-contents', {
      filters: {
        productId: { $eq: productId },
      },
    });

    if (data.length > 0) {
      // Update existing
      await strapiService.client.update('product-contents', data[0].id, {
        data: {
          title: product.title,
          handle: product.handle,
          lastSyncedAt: new Date().toISOString(),
        },
      });

      // Clear related cache
      strapiService.clearCache(`product-content:${productId}`);
      
      console.log(`Synced product ${productId} to Strapi`);
    }
  } catch (error) {
    console.error(`Failed to sync product ${productId} to Strapi:`, error);
    // Don't throw - we don't want to break the main flow
  }
}

export const config: SubscriberConfig = {
  event: 'product.updated',
  context: {
    subscriberId: 'product-updated-strapi-sync',
  },
};