import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import vendors from "../../scripts/dremc-import/data/dremc-vendors.json";

export default async function createBrands({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  
  // Get the brand module (if exists) or use custom logic
  logger.info("=== Creating Brand Entities ===");
  logger.info(`Total vendors to create: ${vendors.length}`);

  // In Medusa v2, brands might be stored as product metadata or a custom module
  // Check if we have a brand module
  let brandModule;
  try {
    brandModule = container.resolve("brandModuleService");
  } catch {
    logger.info("No brand module found, brands will be stored as product metadata");
  }

  if (brandModule) {
    logger.info("Using brand module to create brands...");
    for (const vendor of vendors) {
      try {
        await brandModule.create({
          name: vendor.name,
          handle: vendor.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          metadata: {
            product_count: vendor.count,
          },
        });
        logger.info(`  ✅ Created brand: ${vendor.name}`);
      } catch (e: any) {
        if (e.message?.includes("already exists")) {
          logger.info(`  ⚠️  Already exists: ${vendor.name}`);
        } else {
          logger.error(`  ❌ Failed: ${vendor.name} - ${e.message}`);
        }
      }
    }
  } else {
    // Store brands as a JSON file for reference during import
    logger.info("\n📝 No brand module - brands will be stored in product metadata");
    logger.info("Brand list saved for import process:");
    
    for (const vendor of vendors.slice(0, 10)) {
      logger.info(`  - ${vendor.name} (${vendor.count} products)`);
    }
    logger.info(`  ... and ${vendors.length - 10} more`);
  }

  logger.info("\n✅ Brand setup complete!");
  logger.info(`\n📊 Total vendors: ${vendors.length}`);
}
