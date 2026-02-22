import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  const products = await productModule.listProducts({}, { 
    select: ['id', 'metadata'] 
  });
  
  // Count products with and without category
  let withCategory = 0;
  let withoutCategory = 0;
  const categoryValues = new Map<string, number>();
  
  products.forEach(p => {
    const cat = p.metadata?.category;
    if (cat) {
      withCategory++;
      categoryValues.set(String(cat), (categoryValues.get(String(cat)) || 0) + 1);
    } else {
      withoutCategory++;
    }
  });
  
  console.log('=== CATEGORY METADATA ANALYSIS ===\n');
  console.log(`Products with category metadata: ${withCategory}`);
  console.log(`Products without category metadata: ${withoutCategory}`);
  
  console.log('\nCategory values:');
  categoryValues.forEach((count, cat) => {
    console.log(`  ${cat}: ${count}`);
  });
  
  return { withCategory, withoutCategory };
}
