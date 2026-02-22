import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";

// This script creates products with ALL their variants from DREMC data
const BATCH_FILE = "fresh-batch-2.json";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const brandModule = container.resolve("brand" as any);
  const regionModule = container.resolve(Modules.REGION);
  
  console.log(`=== IMPORTING ${BATCH_FILE} WITH VARIANTS ===\n`);
  
  // Load batch data
  const batchPath = path.join(__dirname, "../../scripts/dremc-import/data", BATCH_FILE);
  const batch = JSON.parse(fs.readFileSync(batchPath, "utf8"));
  
  console.log(`Products in batch: ${batch.products.length}\n`);
  
  // Get brands for linking
  const brands = await brandModule.listBrands({}, { select: ["id", "name"] });
  const brandMap = new Map(brands.map((b: any) => [b.name.toLowerCase(), b.id]));
  
  // Get default region for pricing
  const regions = await regionModule.listRegions({}, { take: 1 });
  const defaultRegion = regions[0];
  const defaultCurrency = defaultRegion?.currency_code || "AUD";
  
  let imported = 0;
  let skipped = 0;
  let totalVariants = 0;
  
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
      
      // Prepare variants
      const variants = product.variants || [];
      const hasMultipleVariants = variants.length > 1;
      
      // Create product with variants
      const productData: any = {
        title: product.title,
        handle: product.handle,
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
        // Create variants
        variants: variants.map((v: any, index: number) => {
          const variantSku = v.sku || `${product.handle}-${index + 1}`;
          return {
            title: v.title || `Variant ${index + 1}`,
            sku: `3DB-${product.vendor?.substring(0, 3).toUpperCase() || "UNK"}-${variantSku}`.substring(0, 100),
            prices: [
              {
                amount: Math.round((v.price || product.price || 0) * 100), // Convert to cents
                currency_code: defaultCurrency,
              }
            ],
            metadata: {
              dremc_variant_id: String(v.id),
              original_sku: v.sku,
            },
            // For inventory - set as unlimited stock
            manage_inventory: false,
            allow_backorder: true,
          };
        }),
      };
      
      // Create the product with variants
      await productModule.createProducts(productData);
      
      console.log(`✅ Created: ${product.title.substring(0, 40)}... (${variants.length} variant${variants.length > 1 ? 's' : ''})`);
      imported++;
      totalVariants += variants.length;
      
    } catch (error: any) {
      console.log(`❌ Error: ${product.handle} - ${error.message}`);
      skipped++;
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Products imported: ${imported}`);
  console.log(`Products skipped: ${skipped}`);
  console.log(`Total variants created: ${totalVariants}`);
  
  return { imported, skipped, totalVariants, total: batch.products.length };
}
