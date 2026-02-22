import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";

// This script adds missing variants to existing products
// It compares the current variants with the source data and adds any missing ones

const BATCH_FILES = [
  "products-batch-1.json",
  "products-batch-2.json", 
  "products-batch-3.json",
  "products-batch-4.json",
  "fresh-batch-1.json",
  "fresh-batch-2.json",
];

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const regionModule = container.resolve(Modules.REGION);
  
  console.log('=== ADDING MISSING VARIANTS ===\n');
  
  // Get default region for pricing
  const regions = await regionModule.listRegions({}, { take: 1 });
  const defaultCurrency = regions[0]?.currency_code || "AUD";
  
  let totalProducts = 0;
  let totalVariantsAdded = 0;
  let productsUpdated = 0;
  
  const dataDir = path.join(__dirname, "../../scripts/dremc-import/data");
  
  for (const batchFile of BATCH_FILES) {
    const batchPath = path.join(dataDir, batchFile);
    
    if (!fs.existsSync(batchPath)) {
      console.log(`Skipping ${batchFile} (not found)`);
      continue;
    }
    
    const batch = JSON.parse(fs.readFileSync(batchPath, "utf8"));
    console.log(`\nProcessing ${batchFile} (${batch.products?.length || 0} products)...`);
    
    for (const sourceProduct of (batch.products || [])) {
      totalProducts++;
      
      try {
        // Find existing product in Medusa
        const existing = await productModule.listProducts({
          handle: sourceProduct.handle,
        });
        
        if (existing.length === 0) {
          continue; // Product not in Medusa yet
        }
        
        const product = existing[0];
        
        // Get current variants
        const currentVariants = await productModule.listProductVariants({
          product_id: product.id,
        });
        
        // Source variants
        const sourceVariants = sourceProduct.variants || [];
        
        if (sourceVariants.length <= currentVariants.length) {
          continue; // Already has all variants
        }
        
        // Find missing variants
        const currentSkus = new Set(currentVariants.map(v => 
          (v.metadata?.original_sku || v.sku)?.toLowerCase()
        ));
        
        const missingVariants = sourceVariants.filter((sv: any) => {
          const svSku = sv.sku?.toLowerCase();
          return !currentSkus.has(svSku);
        });
        
        if (missingVariants.length === 0) {
          continue; // No missing variants
        }
        
        console.log(`\n  ${product.handle}:`);
        console.log(`    Current variants: ${currentVariants.length}`);
        console.log(`    Source variants: ${sourceVariants.length}`);
        console.log(`    Missing: ${missingVariants.length}`);
        
        // Add missing variants
        for (const variant of missingVariants) {
          try {
            await productModule.createProductVariants({
              product_id: product.id,
              title: variant.title || "Default",
              sku: `3DB-${sourceProduct.vendor?.substring(0, 3).toUpperCase() || "UNK"}-${variant.sku}`.substring(0, 100),
              prices: [{
                amount: Math.round((variant.price || 0) * 100),
                currency_code: defaultCurrency,
              }],
              metadata: {
                dremc_variant_id: String(variant.id),
                original_sku: variant.sku,
              },
              manage_inventory: false,
              allow_backorder: true,
            });
            
            console.log(`    ✅ Added: ${variant.title} (${variant.sku})`);
            totalVariantsAdded++;
          } catch (e: any) {
            console.log(`    ❌ Failed: ${variant.title} - ${e.message}`);
          }
        }
        
        productsUpdated++;
        
      } catch (error: any) {
        console.log(`  Error: ${error.message}`);
      }
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Products checked: ${totalProducts}`);
  console.log(`Products updated: ${productsUpdated}`);
  console.log(`Variants added: ${totalVariantsAdded}`);
  
  return { totalProducts, productsUpdated, totalVariantsAdded };
}
