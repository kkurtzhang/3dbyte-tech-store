import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

// Link products to categories based on metadata.category

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const remoteQuery = container.resolve(ContainerRegistrationKeys.QUERY);
  
  console.log('=== LINKING PRODUCTS TO CATEGORIES ===\n');
  
  // Get all categories with their handles
  const categoriesResult = await remoteQuery.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "parent_category_id"],
    pagination: { take: 100 },
  });
  
  const categories = categoriesResult.data || [];
  
  // Build category handle -> ID map
  const categoryByHandle = new Map<string, string>();
  categories.forEach((c: any) => {
    if (c.handle) {
      categoryByHandle.set(c.handle, c.id);
    }
  });
  
  console.log(`Found ${categories.length} categories`);
  
  // Get all products
  const products = await productModule.listProducts({}, { 
    select: ['id', 'handle', 'metadata'] 
  });
  
  console.log(`Found ${products.length} products\n`);
  
  let linked = 0;
  let noMatch = 0;
  const noMatchCategories = new Set<string>();
  
  for (const product of products) {
    const categoryHandle = product.metadata?.category as string;
    
    if (!categoryHandle) {
      noMatchCategories.add('(no category in metadata)');
      noMatch++;
      continue;
    }
    
    // Try to find matching category
    // First try exact match (e.g., "spare-parts/nozzles")
    let categoryId = categoryByHandle.get(categoryHandle);
    
    // If not found, try parent category (e.g., "spare-parts" from "spare-parts/hotends")
    if (!categoryId && categoryHandle.includes('/')) {
      const parentHandle = categoryHandle.split('/')[0];
      categoryId = categoryByHandle.get(parentHandle);
    }
    
    if (categoryId) {
      try {
        await productModule.updateProducts(product.id, {
          categories: [{ id: categoryId }],
        } as any);
        linked++;
        
        if (linked % 100 === 0) {
          console.log(`  Progress: ${linked}/${products.length}`);
        }
      } catch (e: any) {
        console.log(`  Error linking ${product.handle}: ${e.message}`);
      }
    } else {
      noMatchCategories.add(categoryHandle);
      noMatch++;
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Products linked: ${linked}`);
  console.log(`Products without matching category: ${noMatch}`);
  
  if (noMatchCategories.size > 0 && noMatchCategories.size <= 20) {
    console.log('\nCategories not found:');
    noMatchCategories.forEach(c => console.log(`  - ${c}`));
  }
  
  return { linked, noMatch };
}
