import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";

// Update products with missing category metadata from source files

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  console.log('=== UPDATING CATEGORY METADATA ===\n');
  
  // Load all products from source files
  const dataDir = path.join(__dirname, "../../scripts/dremc-import/data");
  const sourceProducts = new Map<string, any>();
  
  // Load from fresh-extract (main source)
  const freshPath = path.join(dataDir, "products-fresh-extract.json");
  if (fs.existsSync(freshPath)) {
    const fresh = JSON.parse(fs.readFileSync(freshPath, "utf8"));
    fresh.products.forEach((p: any) => {
      sourceProducts.set(String(p.dremc_id), p);
    });
    console.log(`Loaded ${sourceProducts.size} products from fresh-extract`);
  }
  
  // Get all products from Medusa
  const products = await productModule.listProducts({}, { 
    select: ['id', 'handle', 'metadata'] 
  });
  
  console.log(`Found ${products.length} products in Medusa\n`);
  
  let updated = 0;
  let notFound = 0;
  
  for (const product of products) {
    const dremcId = product.metadata?.dremc_id;
    
    if (!dremcId) {
      notFound++;
      continue;
    }
    
    const source = sourceProducts.get(String(dremcId));
    
    if (!source) {
      notFound++;
      continue;
    }
    
    // Check if already has category
    if (product.metadata?.category) {
      continue;
    }
    
    // Update with category from source
    if (source.mapped_category) {
      await productModule.updateProducts(product.id, {
        metadata: {
          ...product.metadata,
          category: source.mapped_category,
        },
      });
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`  Updated ${updated}...`);
      }
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Products updated with category: ${updated}`);
  console.log(`Products not found in source: ${notFound}`);
  
  return { updated, notFound };
}
