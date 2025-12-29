import { ExecArgs } from "@medusajs/framework/types";
import { IProductModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { STRAPI_MODULE, StrapiModuleService } from "../modules/strapi";

export default async function syncStrapiScript({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const productModuleService: IProductModuleService = container.resolve(
    Modules.PRODUCT
  );
  const strapiModuleService: StrapiModuleService =
    container.resolve(STRAPI_MODULE);
  logger.info("Starting bulk Strapi sync...");

  let offset = 0;
  const limit = 50;
  let hasMore = true;
  const results = { created: 0, updated: 0, errors: 0 };

  try {
    while (hasMore) {
      const [products, _] = await productModuleService.listAndCountProducts(
        {},
        {
          skip: offset,
          take: limit,
        }
      );

      if (products.length === 0) {
        hasMore = false;
        break;
      }

      // Process products in batches
      for (const product of products) {
        try {
          // Only sync the required fields
          const syncData = {
            id: product.id,
            title: product.title,
            handle: product.handle,
            status: product.status,
          };

          const existing = await strapiModuleService.findProductDescription(
            product.id
          );
          if (existing) {
            await strapiModuleService.updateProductDescription(syncData);
            results.updated++;
          } else {
            await strapiModuleService.createProductDescription(syncData);
            results.created++;
          }
        } catch (error) {
          results.errors++;
          logger.error(
            `Failed to sync product ${product.id}`,
            new Error(error.message)
          );
        }
      }

      offset += limit;

      logger.info(`Processed ${offset} products...`);

      if (products.length < limit) {
        hasMore = false;
      }
    }

    logger.info(`Bulk sync completed:` + results);
  } catch (error) {
    logger.error("Bulk sync failed", new Error(error.message));
    throw error;
  }
}
