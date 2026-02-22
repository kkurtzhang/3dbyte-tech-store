import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const remoteQuery = container.resolve(ContainerRegistrationKeys.QUERY);
  
  // Get all products with their mapped_category
  const products = await productModule.listProducts({}, { 
    select: ['id', 'handle', 'metadata'] 
  });
  
  // Count by mapped_category
  const byCategory: Record<string, number> = {};
  products.forEach(p => {
    const cat = (p.metadata?.category as string) || 'unknown';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });
  
  console.log('=== MAPPED CATEGORIES ===\n');
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));
  
  // Get existing categories
  const categoriesResult = await remoteQuery.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
    pagination: { take: 100 },
  });
  
  console.log('\n=== EXISTING CATEGORIES ===\n');
  const categoryMap = new Map<string, string>();
  (categoriesResult.data || []).forEach((c: any) => {
    const handle = c.handle || '';
    const name = c.name || '';
    console.log(`  ${c.id}: ${name} (${handle})`);
    
    // Map handles to IDs
    categoryMap.set(handle, c.id);
    categoryMap.set(name.toLowerCase(), c.id);
  });
  
  // Check which mapped categories match
  console.log('\n=== CATEGORY MAPPING ===\n');
  const categoryMapping: Record<string, string | null> = {};
  
  Object.keys(byCategory).forEach(cat => {
    const parts = cat.split('/');
    const mainCat = parts[0];
    const subCat = parts[1] || null;
    
    // Try to find matching category
    let matchedId = categoryMap.get(mainCat);
    if (!matchedId) {
      matchedId = categoryMap.get(mainCat.replace(/-/g, ''));
    }
    
    categoryMapping[cat] = matchedId || null;
    console.log(`  ${cat} → ${matchedId || 'NO MATCH'}`);
  });
  
  // Count products that can be linked
  let canLink = 0;
  let cannotLink = 0;
  
  products.forEach(p => {
    const cat = (p.metadata?.category as string) || 'unknown';
    if (categoryMapping[cat]) {
      canLink++;
    } else {
      cannotLink++;
    }
  });
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Products that can be linked: ${canLink}`);
  console.log(`Products without matching category: ${cannotLink}`);
  
  return { canLink, cannotLink, categories: categoriesResult.data?.length };
}
