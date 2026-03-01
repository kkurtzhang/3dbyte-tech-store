import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  // Get all products
  const products = await productModule.listProducts({}, { 
    select: ['id', 'handle', 'metadata'] 
  });
  
  console.log('=== PRODUCT STATUS CHECK ===\n');
  console.log(`Total products: ${products.length}`);
  
  // Check brand linking
  const withBrand = products.filter(p => p.metadata?.brand_id);
  const withoutBrand = products.filter(p => !p.metadata?.brand_id);
  
  console.log(`\nBrand linking:`);
  console.log(`  With brand_id: ${withBrand.length}`);
  console.log(`  Without brand_id: ${withoutBrand.length}`);
  
  // Check vendor distribution
  const byVendor: Record<string, number> = {};
  products.forEach(p => {
    const vendor = (p.metadata?.vendor as string) || 'Unknown';
    byVendor[vendor] = (byVendor[vendor] || 0) + 1;
  });
  
  console.log(`\nTop vendors:`);
  Object.entries(byVendor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([v, c]) => console.log(`  ${v}: ${c}`));
  
  // Check DREMC ID coverage
  const withDremcId = products.filter(p => p.metadata?.dremc_id);
  console.log(`\nDREMC ID coverage: ${withDremcId.length}/${products.length}`);
  
  return { 
    total: products.length, 
    withBrand: withBrand.length,
    withoutBrand: withoutBrand.length 
  };
}
