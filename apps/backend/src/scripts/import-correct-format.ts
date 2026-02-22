import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";

// CORRECT Medusa v2 import format:
// - options: [{ title: "Type", values: ["value1", "value2"] }]
// - variants: [{ title: "...", options: { "Type": "value1" } }]

const BATCH_FILE = "fresh-batch-1.json";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const brandModule = container.resolve("brand" as any);
  const regionModule = container.resolve(Modules.REGION);
  
  console.log(`=== IMPORTING ${BATCH_FILE} (CORRECT FORMAT) ===\n`);
  
  // Load batch data
  const batchPath = path.join(__dirname, "../../scripts/dremc-import/data", BATCH_FILE);
  const batch = JSON.parse(fs.readFileSync(batchPath, "utf8"));
  
  console.log(`Products in batch: ${batch.products.length}\n`);
  
  // Get brands for linking
  const brands = await brandModule.listBrands({}, { select: ["id", "name"] });
  const brandMap = new Map(brands.map((b: any) => [b.name.toLowerCase(), b.id]));
  
  // Get default currency
  const regions = await regionModule.listRegions({}, { take: 1 });
  const defaultCurrency = regions[0]?.currency_code || "AUD";
  
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
      
      // Prepare variants with proper option format
      const variants = product.variants || [];
      const hasMultipleVariants = variants.length > 1;
      
      // Create product with options and variants in ONE call
      // Using the correct Medusa v2 format from docs
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
          category: product.mapped_category,
        },
      };
      
      // Add options and variants if we have multiple variants
      if (hasMultipleVariants) {
        // Collect all unique option values (variant titles)
        const optionValues = variants.map((v: any) => v.title || `Variant ${variants.indexOf(v) + 1}`);
        
        productData.options = [
          {
            title: "Type",  // Meaningful option name (not "Variant")
            values: optionValues,
          },
        ];
        
        productData.variants = variants.map((v: any, index: number) => {
          const variantTitle = v.title || `Variant ${index + 1}`;
          const variantSku = v.sku || `${product.handle}-${index + 1}`;
          
          return {
            title: variantTitle,
            sku: `3DB-${product.vendor?.substring(0, 3).toUpperCase() || "UNK"}-${variantSku}`.substring(0, 100),
            prices: [{
              amount: Math.round((v.price || product.price || 0) * 100),
              currency_code: defaultCurrency,
            }],
            options: {
              "Type": variantTitle,  // Use option TITLE and value STRING
            },
            metadata: {
              dremc_variant_id: String(v.id),
              original_sku: v.sku,
            },
            manage_inventory: false,
            allow_backorder: true,
          };
        });
      } else {
        // Single variant - still create with Type option for consistency
        const v = variants[0] || { title: "Default", price: product.price };
        const variantTitle = v.title || "Default";
        const variantSku = v.sku || product.sku || product.handle;
        
        productData.options = [
          {
            title: "Type",
            values: [variantTitle],
          },
        ];
        
        productData.variants = [{
          title: variantTitle,
          sku: `3DB-${product.vendor?.substring(0, 3).toUpperCase() || "UNK"}-${variantSku}`.substring(0, 100),
          prices: [{
            amount: Math.round((v.price || product.price || 0) * 100),
            currency_code: defaultCurrency,
          }],
          options: {
            "Type": variantTitle,
          },
          metadata: {
            dremc_variant_id: String(v.id || ""),
            original_sku: v.sku,
          },
          manage_inventory: false,
          allow_backorder: true,
        }];
      }
      
      // Create the product with everything in one call
      await productModule.createProducts(productData);
      
      console.log(`✅ ${product.title.substring(0, 50)}... (${variants.length} variant${variants.length > 1 ? 's' : ''})`);
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
