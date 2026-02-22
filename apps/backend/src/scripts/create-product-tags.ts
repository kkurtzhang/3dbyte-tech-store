import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";

// Create and link product tags from DREMC source data

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  console.log('=== CREATING PRODUCT TAGS ===\n');
  
  // Load source products
  const sourcePath = path.join(__dirname, "../../scripts/dremc-import/data/products-fresh-extract.json");
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  
  // Build dremc_id -> tags map
  const productTags = new Map<string, string[]>();
  const allTags = new Set<string>();
  
  source.products.forEach((p: any) => {
    const tags = p.tags || [];
    if (p.dremc_id && tags.length > 0) {
      productTags.set(String(p.dremc_id), tags);
      tags.forEach((t: string) => {
        if (t) allTags.add(t);
      });
    }
  });
  
  console.log(`Products with tags in source: ${productTags.size}`);
  console.log(`Unique tags: ${allTags.size}`);
  console.log(`Sample tags:`, Array.from(allTags).slice(0, 10), '\n');
  
  // Get all products from Medusa
  const products = await productModule.listProducts({}, { 
    select: ['id', 'handle', 'metadata'] 
  });
  
  console.log(`Products in Medusa: ${products.length}\n`);
  
  // Link tags to products
  let linked = 0;
  let noTags = 0;
  let errors = 0;
  
  for (const product of products) {
    const dremcId = product.metadata?.dremc_id;
    
    if (!dremcId) {
      noTags++;
      continue;
    }
    
    const tags = productTags.get(String(dremcId));
    
    if (!tags || tags.length === 0) {
      noTags++;
      continue;
    }
    
    // Filter out any undefined/null tags
    const validTags = tags.filter(t => t && typeof t === 'string');
    
    if (validTags.length === 0) {
      noTags++;
      continue;
    }
    
    try {
      await productModule.updateProducts(product.id, {
        tags: validTags.map(t => ({ value: t })),
      } as any);
      
      linked++;
      
      if (linked % 100 === 0) {
        console.log(`  Progress: ${linked} products...`);
      }
    } catch (e: any) {
      console.log(`  Error for ${product.handle}: ${e.message}`);
      errors++;
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Products linked: ${linked}`);
  console.log(`Products without tags: ${noTags}`);
  console.log(`Errors: ${errors}`);
  
  return { linked, noTags, errors };
}
