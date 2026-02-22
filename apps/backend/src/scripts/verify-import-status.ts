import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const remoteQuery = container.resolve(ContainerRegistrationKeys.QUERY);
  
  // Query a sample of products with their options and variants
  const result = await remoteQuery.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "options.id",
      "options.title", 
      "options.values.id",
      "options.values.value",
      "variants.id",
      "variants.title",
      "variants.options.value",
      "variants.options.option.title",
    ],
    pagination: { take: 5 },
  });
  
  console.log('=== SAMPLE PRODUCTS WITH OPTIONS ===\n');
  
  for (const product of result.data || []) {
    console.log(`\n${product.title?.substring(0, 50)}...`);
    console.log(`  Options: ${product.options?.length || 0}`);
    
    for (const opt of product.options || []) {
      console.log(`    - ${opt.title}: ${(opt.values || []).length} values`);
    }
    
    console.log(`  Variants: ${product.variants?.length || 0}`);
    
    for (const v of (product.variants || []).slice(0, 3)) {
      const optValues = (v.options || []).map((o: any) => o.value).join(', ');
      console.log(`    - ${v.title}: [${optValues || 'NO OPTIONS'}]`);
    }
  }
  
  // Count products with proper options
  const allProducts = await remoteQuery.graph({
    entity: "product",
    fields: ["id", "options.id"],
    pagination: { take: 2000 },
  });
  
  const withOptions = (allProducts.data || []).filter((p: any) => p.options?.length > 0);
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total products: ${allProducts.data?.length || 0}`);
  console.log(`With options: ${withOptions.length}`);
  console.log(`Without options: ${(allProducts.data?.length || 0) - withOptions.length}`);
  
  return { total: allProducts.data?.length, withOptions: withOptions.length };
}
