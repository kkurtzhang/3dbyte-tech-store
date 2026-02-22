import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";

export default async function importFreshBatch1({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const productModuleService = container.resolve(Modules.PRODUCT);

  logger.info("=== IMPORTING FRESH BATCH 1 PRODUCTS ===");

  const dataPath = path.join(__dirname, "../../scripts/dremc-import/data/fresh-batch-1.json");
  const productsData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const products = productsData.products;

  logger.info(`Loading ${products.length} products from fresh batch 1...`);

  const categories = await productModuleService.listProductCategories({}, { select: ["id", "handle"] });
  const categoryMap = new Map(categories.map(c => [c.handle, c.id]));
  logger.info(`Found ${categories.length} categories`);

  let imported = 0, skipped = 0;

  for (const product of products) {
    try {
      const vendorCode = product.vendor.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
      const sku = `3DB-${vendorCode}-${product.sku || product.handle}`.slice(0, 50);
      const cleanHandle = product.handle.replace(/[^\w-]/g, '').toLowerCase();
      const thumbnail = product.images?.[0] || null;

      const newProduct = await productModuleService.createProducts({
        title: product.title,
        handle: cleanHandle,
        description: product.body_html?.replace(/<[^>]*>/g, "").slice(0, 500) || product.title,
        subtitle: product.vendor,
        thumbnail,
        status: "published",
        external_id: String(product.dremc_id),
        metadata: {
          dremc_id: product.dremc_id,
          vendor: product.vendor,
          batch: "fresh-1",
          image_source: "distributor",
          imported_at: new Date().toISOString(),
        },
        tags: [],
      });

      const categoryId = categoryMap.get(product.mapped_category || "accessories");
      if (categoryId) {
        await productModuleService.updateProducts(newProduct.id, { categories: [{ id: categoryId }] });
      }

      if (product.variants?.[0]) {
        await productModuleService.createProductVariants({
          product_id: newProduct.id,
          title: product.variants[0].title || "Default",
          sku,
          prices: product.variants[0].price ? [{ amount: Math.round(product.variants[0].price * 100), currency_code: "AUD" }] : [],
          allow_backorder: true,
          manage_inventory: false,
        });
      }

      imported++;
      logger.info(`  ✅ ${product.title.slice(0, 40)}... (${product.vendor})`);
    } catch (error: any) {
      skipped++;
      logger.error(`  ❌ ${product.title.slice(0, 40)}... - ${error.message}`);
    }
  }

  logger.info(`\n📊 FRESH BATCH 1: ✅ ${imported} / ❌ ${skipped}`);
}
