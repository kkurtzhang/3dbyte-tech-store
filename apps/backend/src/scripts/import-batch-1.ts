import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";

export default async function importBatch1({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const productModuleService = container.resolve(Modules.PRODUCT);

  logger.info("=== IMPORTING DREMC BATCH 1 PRODUCTS ===");

  // Load product data
  const dataPath = path.join(__dirname, "../../scripts/dremc-import/data/products-batch-1-with-images.json");
  const productsData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const products = productsData.products;

  logger.info(`Loading ${products.length} products from batch 1...`);

  // Load category mapping
  const categories = await productModuleService.listProductCategories({}, {
    select: ["id", "handle"],
  });
  const categoryMap = new Map(categories.map(c => [c.handle, c.id]));
  logger.info(`Found ${categories.length} categories`);

  let imported = 0;
  let skipped = 0;

  for (const product of products) {
    try {
      // Generate SKU: 3DB-{VENDOR}-{ORIGINAL-SKU}
      const vendorCode = product.vendor.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
      const originalSku = product.sku || product.handle;
      const sku = `3DB-${vendorCode}-${originalSku}`.slice(0, 50);

      // Map category
      const categoryHandle = product.mapped_category || "accessories";
      const categoryId = categoryMap.get(categoryHandle);

      // Use distributor images with attribution
      const images = product.images || [];
      const thumbnail = images[0] || null;

      // Create product
      const newProduct = await productModuleService.createProducts({
        title: product.title,
        handle: `dremc-${product.handle}`,
        description: product.body_html?.replace(/<[^>]*>/g, "").slice(0, 500) || product.title,
        subtitle: product.vendor,
        thumbnail: thumbnail,
        status: "published",
        external_id: String(product.dremc_id),
        metadata: {
          dremc_id: product.dremc_id,
          vendor: product.vendor,
          original_sku: product.sku,
          image_source: product.manufacturer_image_url ? "manufacturer" : "distributor",
          imported_at: new Date().toISOString(),
          tags: product.tags?.join(",") || "",
        },
        tags: [], // Skip tags for now - will add later
      });

      // Link to category if found
      if (categoryId) {
        await productModuleService.updateProducts(newProduct.id, {
          categories: [{ id: categoryId }],
        });
      }

      // Create product variant
      if (product.variants && product.variants.length > 0) {
        const variant = product.variants[0];
        await productModuleService.createProductVariants({
          product_id: newProduct.id,
          title: variant.title || "Default",
          sku: sku,
          prices: variant.price ? [
            {
              amount: Math.round(variant.price * 100), // Convert to cents
              currency_code: "AUD",
            }
          ] : [],
          allow_backorder: true,
          manage_inventory: false,
        });
      }

      imported++;
      logger.info(`  ✅ Imported: ${product.title.slice(0, 40)}... (${product.vendor})`);

    } catch (error: any) {
      skipped++;
      logger.error(`  ❌ Failed: ${product.title.slice(0, 40)}... - ${error.message}`);
    }
  }

  logger.info(`\n📊 IMPORT COMPLETE`);
  logger.info(`  ✅ Imported: ${imported}`);
  logger.info(`  ❌ Skipped: ${skipped}`);
  logger.info(`  📁 Total processed: ${products.length}`);
}
