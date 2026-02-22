import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";

// Master import script - accepts batch number as parameter
// Usage: Pass batch number in metadata or use BATCH_FILE env

const BATCH_NUMBER = parseInt(process.env.BATCH || "2");
const BATCH_FILE = `fresh-batch-${BATCH_NUMBER}.json`;

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const brandModule = container.resolve("brand" as any);
  const regionModule = container.resolve(Modules.REGION);
  
  console.log(`=== IMPORTING BATCH ${BATCH_NUMBER} ===\n`);
  
  // Load batch data
  const batchPath = path.join(__dirname, `../../scripts/dremc-import/data/${BATCH_FILE}`);
  
  if (!fs.existsSync(batchPath)) {
    console.log(`Batch file not found: ${BATCH_FILE}`);
    return { error: "file not found" };
  }
  
  const batch = JSON.parse(fs.readFileSync(batchPath, "utf8"));
  console.log(`Products in batch: ${batch.products.length}\n`);
  
  // Get brands and region
  const brands = await brandModule.listBrands({}, { select: ["id", "name"] });
  const brandMap = new Map(brands.map((b: any) => [b.name.toLowerCase(), b.id]));
  const regions = await regionModule.listRegions({}, { take: 1 });
  const defaultCurrency = regions[0]?.currency_code || "AUD";
  
  let imported = 0, skipped = 0;
  
  for (const product of batch.products) {
    try {
      // Skip if exists
      const existing = await productModule.listProducts({ handle: product.handle });
      if (existing.length > 0) { skipped++; continue; }
      
      const brandId = brandMap.get(product.vendor?.toLowerCase() || "");
      const variants = product.variants || [];
      
      // Clean handle - remove non-URL-safe characters
      const cleanHandle = product.handle.replace(/[^\w-]/g, '');
      
      // Build product with correct option format
      const productData: any = {
        title: product.title,
        handle: cleanHandle,
        status: "published",
        is_giftcard: false,
        discountable: true,
        metadata: {
          vendor: product.vendor,
          dremc_id: String(product.dremc_id),
          brand_id: brandId || undefined,
        },
        options: [{
          title: "Type",
          values: variants.map((v: any) => v.title || "Default"),
        }],
        variants: variants.map((v: any, i: number) => ({
          title: v.title || `Variant ${i + 1}`,
          sku: `3DB-${(product.vendor || "UNK").substring(0,3).toUpperCase()}-${v.sku || i}`.substring(0,100),
          prices: [{ amount: Math.round((v.price || product.price || 0) * 100), currency_code: defaultCurrency }],
          options: { "Type": v.title || "Default" },
          manage_inventory: false,
          allow_backorder: true,
        })),
      };
      
      await productModule.createProducts(productData);
      imported++;
      
    } catch (e: any) {
      console.log(`❌ ${product.handle}: ${e.message}`);
      skipped++;
    }
  }
  
  console.log(`\nBatch ${BATCH_NUMBER}: ${imported} imported, ${skipped} skipped`);
  return { batch: BATCH_NUMBER, imported, skipped };
}
