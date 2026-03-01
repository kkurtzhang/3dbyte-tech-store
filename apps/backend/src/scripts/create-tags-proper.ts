import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";

// Create tags first, then link products by tag ID

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  console.log('=== CREATING PRODUCT TAGS ===\n');
  
  // Load source data
  const sourcePath = path.join(__dirname, "../../scripts/dremc-import/data/products-fresh-extract.json");
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  
  // Collect all unique tags
  const allTags = new Set<string>();
  const productTags = new Map<string, string[]>();
  
  source.products.forEach((p: any) => {
    const tags = (p.tags || []).filter((t: string) => t && typeof t === 'string');
    if (p.dremc_id && tags.length > 0) {
      productTags.set(String(p.dremc_id), tags);
      tags.forEach((t: string) => allTags.add(t));
    }
  });
  
  console.log(`Unique tags: ${allTags.size}`);
  console.log(`Products with tags: ${productTags.size}\n`);
  
  // Create all tags first
  console.log('Creating tags...');
  const tagValueToId = new Map<string, string>();
  
  for (const tagValue of allTags) {
    try {
      const created = await productModule.createProductTags([{ value: tagValue }]);
      if (created.length > 0) {
        tagValueToId.set(tagValue, created[0].id);
      }
    } catch (e: any) {
      // Tag might already exist - try to find it
      const existing = await productModule.listProductTags({ value: tagValue });
      if (existing.length > 0) {
        tagValueToId.set(tagValue, existing[0].id);
      }
    }
  }
  
  console.log(`Tags created/found: ${tagValueToId.size}\n`);
  
  // Get all products from Medusa
  const products = await productModule.listProducts({}, { 
    select: ['id', 'metadata'] 
  });
  
  console.log(`Linking tags to ${products.length} products...\n`);
  
  let linked = 0;
  let noTags = 0;
  
  for (const product of products) {
    const dremcId = product.metadata?.dremc_id;
    if (!dremcId) {
      noTags++;
      continue;
    }
    
    const tagValues = productTags.get(String(dremcId)) || [];
    if (tagValues.length === 0) {
      noTags++;
      continue;
    }
    
    // Get tag IDs for values
    const tagIds = tagValues
      .map(v => tagValueToId.get(v))
      .filter(id => id);
    
    if (tagIds.length === 0) {
      noTags++;
      continue;
    }
    
    try {
      await productModule.updateProducts(product.id, {
        tags: tagIds.map(id => ({ id })),
      } as any);
      linked++;
      
      if (linked % 100 === 0) {
        console.log(`  Progress: ${linked}/${products.length}`);
      }
    } catch (e: any) {
      console.log(`  Error for ${product.handle}: ${e.message}`);
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Products linked: ${linked}`);
  console.log(`Products without tags: ${noTags}`);
  
  return { linked, noTags, tagsCreated: tagValueToId.size };
}
