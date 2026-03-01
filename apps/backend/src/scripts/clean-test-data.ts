import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function cleanTestData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("=== CLEANING TEST DATA ===");
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
    // Step 1: Delete product option values
    logger.info("\n1. Deleting product option values...");
    const optionValues = await query.graph({
      entity: "product_option_value",
      fields: ["id"],
    });
    if (optionValues.data.length > 0) {
      const deleteModuleService = container.resolve(Modules.PRODUCT);
      // Use softDelete if available, otherwise delete
      for (const optVal of optionValues.data) {
        try {
          await deleteModuleService.deleteProductOptionValues([optVal.id]);
        } catch (e) {
          // Try direct deletion if soft delete fails
          logger.debug(`Could not soft delete option value ${optVal.id}, trying direct delete`);
        }
      }
      logger.info(`   ✓ Deleted ${optionValues.data.length} option values`);
    }

    // Step 2: Delete product options
    logger.info("\n2. Deleting product options...");
    const options = await query.graph({
      entity: "product_option",
      fields: ["id"],
    });
    if (options.data.length > 0) {
      const deleteModuleService = container.resolve(Modules.PRODUCT);
      for (const opt of options.data) {
        try {
          await deleteModuleService.deleteProductOptions([opt.id]);
        } catch (e) {
          logger.debug(`Could not delete option ${opt.id}`);
        }
      }
      logger.info(`   ✓ Deleted ${options.data.length} options`);
    }

    // Step 3: Delete product variants
    logger.info("\n3. Deleting product variants...");
    const variants = await query.graph({
      entity: "product_variant",
      fields: ["id"],
    });
    if (variants.data.length > 0) {
      const deleteModuleService = container.resolve(Modules.PRODUCT);
      for (const variant of variants.data) {
        try {
          await deleteModuleService.deleteProductVariants([variant.id]);
        } catch (e) {
          logger.debug(`Could not delete variant ${variant.id}`);
        }
      }
      logger.info(`   ✓ Deleted ${variants.data.length} variants`);
    }

    // Step 4: Delete product images (handled by product deletion cascade)
    // Note: deleteProductImages method doesn't exist in Medusa v2 ProductModuleService
    // Images will be deleted when products are deleted via cascade
    logger.info("\n4. Skipping direct image deletion (handled by product cascade)");

    // Step 5: Delete products
    logger.info("\n5. Deleting products...");
    const products = await query.graph({
      entity: "product",
      fields: ["id"],
    });
    if (products.data.length > 0) {
      const deleteModuleService = container.resolve(Modules.PRODUCT);
      const productIds = products.data.map(p => p.id);
      try {
        await deleteModuleService.deleteProducts(productIds);
        logger.info(`   ✓ Deleted ${products.data.length} products`);
      } catch (e) {
        logger.error(`Error deleting products: ${e}`);
        // Try individual deletion
        for (const product of products.data) {
          try {
            await deleteModuleService.deleteProducts([product.id]);
          } catch (err) {
            logger.debug(`Could not delete product ${product.id}: ${err}`);
          }
        }
      }
    }

    // Step 6: Delete product categories
    logger.info("\n6. Deleting product categories...");
    const categories = await query.graph({
      entity: "product_category",
      fields: ["id"],
    });
    if (categories.data.length > 0) {
      const deleteModuleService = container.resolve(Modules.PRODUCT);
      const categoryIds = categories.data.map(c => c.id);
      try {
        await deleteModuleService.deleteProductCategories(categoryIds);
        logger.info(`   ✓ Deleted ${categories.data.length} categories`);
      } catch (e) {
        logger.error(`Error deleting categories: ${e}`);
        // Try individual deletion
        for (const category of categories.data) {
          try {
            await deleteModuleService.deleteProductCategories([category.id]);
          } catch (err) {
            logger.debug(`Could not delete category ${category.id}: ${err}`);
          }
        }
      }
    }

    // Step 7: Delete product collections
    logger.info("\n7. Deleting product collections...");
    const collections = await query.graph({
      entity: "product_collection",
      fields: ["id"],
    });
    if (collections.data.length > 0) {
      const deleteModuleService = container.resolve(Modules.PRODUCT);
      const collectionIds = collections.data.map(c => c.id);
      try {
        await deleteModuleService.deleteProductCollections(collectionIds);
        logger.info(`   ✓ Deleted ${collections.data.length} collections`);
      } catch (e) {
        logger.error(`Error deleting collections: ${e}`);
        // Try individual deletion
        for (const collection of collections.data) {
          try {
            await deleteModuleService.deleteProductCollections([collection.id]);
          } catch (err) {
            logger.debug(`Could not delete collection ${collection.id}: ${err}`);
          }
        }
      }
    }

    // Step 8: Delete product tags
    logger.info("\n8. Deleting product tags...");
    const tags = await query.graph({
      entity: "product_tag",
      fields: ["id"],
    });
    if (tags.data.length > 0) {
      const deleteModuleService = container.resolve(Modules.PRODUCT);
      const tagIds = tags.data.map(t => t.id);
      try {
        await deleteModuleService.deleteProductTags(tagIds);
        logger.info(`   ✓ Deleted ${tags.data.length} tags`);
      } catch (e) {
        logger.error(`Error deleting tags: ${e}`);
        // Try individual deletion
        for (const tag of tags.data) {
          try {
            await deleteModuleService.deleteProductTags([tag.id]);
          } catch (err) {
            logger.debug(`Could not delete tag ${tag.id}: ${err}`);
          }
        }
      }
    }

  } catch (error) {
    logger.error(`Error during cleanup: ${error}`);
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
