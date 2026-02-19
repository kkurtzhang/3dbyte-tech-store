import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function fixHandles({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const productModuleService = container.resolve(Modules.PRODUCT);

  logger.info("=== FIXING PRODUCT HANDLES (removing dremc- prefix) ===");

  // Get all products with dremc- prefix
  const products = await productModuleService.listProducts({
    handle: { $like: "dremc-%" },
  }, {
    select: ["id", "handle", "title"],
  });

  logger.info(`Found ${products.length} products to fix`);

  let updated = 0;
  for (const product of products) {
    const newHandle = product.handle.replace("dremc-", "");
    
    try {
      await productModuleService.updateProducts(product.id, {
        handle: newHandle,
      });
      updated++;
      logger.info(`  ✅ ${product.handle} → ${newHandle}`);
    } catch (error: any) {
      logger.error(`  ❌ Failed: ${product.handle} - ${error.message}`);
    }
  }

  logger.info(`\n✅ Updated ${updated}/${products.length} product handles`);
}
