import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function cleanTestDataSQL({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("=== CLEANING TEST DATA (Direct SQL) ===");
  logger.info("Database: medusa-3dbytetech-store");

  // Get current counts BEFORE cleanup
  logger.info("\n📊 COUNTS BEFORE CLEANUP:");

  try {
    const products = await query.graph({
      entity: "product",
      fields: ["id"],
    });
    logger.info(`  - Products: ${products.data.length}`);

    const categories = await query.graph({
      entity: "product_category",
      fields: ["id"],
    });
    logger.info(`  - Product Categories: ${categories.data.length}`);

    const collections = await query.graph({
      entity: "product_collection",
      fields: ["id"],
    });
    logger.info(`  - Product Collections: ${collections.data.length}`);

    const tags = await query.graph({
      entity: "product_tag",
      fields: ["id"],
    });
    logger.info(`  - Product Tags: ${tags.data.length}`);

    const variants = await query.graph({
      entity: "product_variant",
      fields: ["id"],
    });
    logger.info(`  - Product Variants: ${variants.data.length}`);

    const images = await query.graph({
      entity: "product_image",
      fields: ["id"],
    });
    logger.info(`  - Product Images: ${images.data.length}`);

    const options = await query.graph({
      entity: "product_option",
      fields: ["id"],
    });
    logger.info(`  - Product Options: ${options.data.length}`);

    const optionValues = await query.graph({
      entity: "product_option_value",
      fields: ["id"],
    });
    logger.info(`  - Product Option Values: ${optionValues.data.length}`);

  } catch (error) {
    logger.error(`Error counting data: ${error}`);
    return;
  }

  // Delete data in the correct order (respecting foreign key constraints)
  logger.info("\n🧹 STARTING CLEANUP...");

  try {
    // Get the link module which gives us access to database operations
    const link = container.resolve(ContainerRegistrationKeys.LINK);

    // Get all product-related IDs first
    const allProducts = await query.graph({
      entity: "product",
      fields: ["id"],
    });

    const allCategories = await query.graph({
      entity: "product_category",
      fields: ["id"],
    });

    const allCollections = await query.graph({
      entity: "product_collection",
      fields: ["id"],
    });

    const allTags = await query.graph({
      entity: "product_tag",
      fields: ["id"],
    });

    logger.info(`\nDeleting ${allProducts.data.length} products...`);

    // Use Medusa's delete methods on the product module
    const productModuleService = container.resolve(Modules.PRODUCT);

    // Step 1: Delete products first (this should cascade to variants, images, options)
    if (allProducts.data.length > 0) {
      const productIds = allProducts.data.map((p: any) => p.id);
      await productModuleService.softDeleteProducts(productIds);
      logger.info(`   ✓ Soft deleted ${productIds.length} products`);
    }

    // Step 2: Delete categories
    if (allCategories.data.length > 0) {
      const categoryIds = allCategories.data.map((c: any) => c.id);
      await productModuleService.softDeleteProductCategories(categoryIds);
      logger.info(`   ✓ Soft deleted ${categoryIds.length} categories`);
    }

    // Step 3: Delete collections
    if (allCollections.data.length > 0) {
      const collectionIds = allCollections.data.map((c: any) => c.id);
      await productModuleService.softDeleteProductCollections(collectionIds);
      logger.info(`   ✓ Soft deleted ${collectionIds.length} collections`);
    }

    // Step 4: Delete tags
    if (allTags.data.length > 0) {
      const tagIds = allTags.data.map((t: any) => t.id);
      await productModuleService.softDeleteProductTags(tagIds);
      logger.info(`   ✓ Soft deleted ${tagIds.length} tags`);
    }

  } catch (error) {
    logger.error(`Error during cleanup: ${error}`);
    logger.error(JSON.stringify(error, null, 2));
    return;
  }

  // Get counts AFTER cleanup
  logger.info("\n📊 COUNTS AFTER CLEANUP:");

  try {
    const products = await query.graph({
      entity: "product",
      fields: ["id"],
    });
    logger.info(`  - Products: ${products.data.length}`);

    const categories = await query.graph({
      entity: "product_category",
      fields: ["id"],
    });
    logger.info(`  - Product Categories: ${categories.data.length}`);

    const collections = await query.graph({
      entity: "product_collection",
      fields: ["id"],
    });
    logger.info(`  - Product Collections: ${collections.data.length}`);

    const tags = await query.graph({
      entity: "product_tag",
      fields: ["id"],
    });
    logger.info(`  - Product Tags: ${tags.data.length}`);

    const variants = await query.graph({
      entity: "product_variant",
      fields: ["id"],
    });
    logger.info(`  - Product Variants: ${variants.data.length}`);

    const images = await query.graph({
      entity: "product_image",
      fields: ["id"],
    });
    logger.info(`  - Product Images: ${images.data.length}`);

    const options = await query.graph({
      entity: "product_option",
      fields: ["id"],
    });
    logger.info(`  - Product Options: ${options.data.length}`);

    const optionValues = await query.graph({
      entity: "product_option_value",
      fields: ["id"],
    });
    logger.info(`  - Product Option Values: ${optionValues.data.length}`);

  } catch (error) {
    logger.error(`Error counting data after cleanup: ${error}`);
  }

  logger.info("\n✅ CLEANUP COMPLETE!");
  logger.info("\n⚠️  NOTE: The following were preserved:");
  logger.info("  - Users and authentication data");
  logger.info("  - Regions and tax configuration");
  logger.info("  - Store configuration");
  logger.info("  - Payment providers");
  logger.info("  - Shipping profiles and options");
  logger.info("  - Sales channels");
  logger.info("  - Inventory and stock locations");
}
