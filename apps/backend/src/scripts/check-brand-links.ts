import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  // Get all products
  const products = await productModule.listProducts({}, { 
    select: ['id', 'handle', 'title', 'metadata'] 
  });
  
  console.log('=== BRAND LINKING CHECK ===\n');
  console.log('Total products:', products.length);
  
  const withBrand = products.filter(p => p.metadata?.brand_id);
  const withoutBrand = products.filter(p => !p.metadata?.brand_id);
  
  console.log('With brand_id:', withBrand.length);
  console.log('Without brand_id:', withoutBrand.length);
  
  // Show products missing brand
  if (withoutBrand.length > 0) {
    console.log('\nProducts WITHOUT brand (sample):');
    withoutBrand.slice(0, 10).forEach(p => {
      console.log(`  - ${p.handle}`);
      console.log(`    vendor: ${p.metadata?.vendor || 'none'}`);
    });
  }
  
  // Group by vendor to see what brands we need
  const byVendor = {};
  withoutBrand.forEach(p => {
    const vendor = p.metadata?.vendor || 'Unknown';
    byVendor[vendor] = (byVendor[vendor] || 0) + 1;
  });
  
  console.log('\nMissing brand links by vendor:');
  Object.entries(byVendor)
    .sort((a, b) => b[1] - a[1])
    .forEach(([v, c]) => console.log(`  ${v}: ${c}`));
  
  return { total: products.length, withBrand: withBrand.length, withoutBrand: withoutBrand.length };
}
