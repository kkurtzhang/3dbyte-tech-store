import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";

const BATCH_FILE = "fresh-batch-2.json";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const brandModule = container.resolve("brand" as any);
  
  console.log(`=== IMPORTING ${BATCH_FILE} ===\n`);
  
  // Load batch data
  const batchPath = path.join(__dirname, "../../scripts/dremc-import/data", BATCH_FILE);
  const batch = JSON.parse(fs.readFileSync(batchPath, "utf8"));
  
  console.log(`Products in batch: ${batch.products.length}\n`);
  
  // Get all brands for linking
  const brands = await brandModule.listBrands({}, { select: ["id", "name"] });
  const brandMap = new Map(brands.map((b: any) => [b.name.toLowerCase(), b.id]));
  
  let imported = 0;
  let skipped = 0;
  
  for (const product of batch.products) {
    try {
      // Check if product already exists
      const existing = await productModule.listProducts({
        handle: product.handle,
      });
      
      if (existing.length > 0) {
        console.log(`⏭️ Skipping ${product.handle} (already exists)`);
        skipped++;
        continue;
      }
      
      // Find brand
      const brandId = brandMap.get(product.vendor?.toLowerCase() || "");
      
      // Create SKU
      const sku = `3DB-${product.vendor?.substring(0, 3).toUpperCase() || "UNK"}-${product.sku || product.handle}`.substring(0, 50);
      
      // Create product
      await productModule.createProducts({
        title: product.title,
        handle: product.handle,
        sku: sku,
        external_id: String(product.dremc_id),
        status: "published",
        is_giftcard: false,
        discountable: true,
        metadata: {
          vendor: product.vendor,
          dremc_id: String(product.dremc_id),
          brand_id: brandId || undefined,
          original_price: product.price,
          category: product.mapped_category,
        },
      });
      
      console.log(`✅ Created: ${product.title.substring(0, 50)}...`);
      imported++;
      
    } catch (error: any) {
      console.log(`❌ Error: ${product.handle} - ${error.message}`);
      skipped++;
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped/Errors: ${skipped}`);
  
  return { imported, skipped, total: batch.products.length };
}
