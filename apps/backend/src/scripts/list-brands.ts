import { ExecArgs } from "@medusajs/framework/types";
import { BRAND_MODULE } from "../modules/brand";

export default async function ({ container }: ExecArgs) {
  const brandModuleService = container.resolve(BRAND_MODULE);
  
  // Get all brands
  const brands = await brandModuleService.listBrands({}, { 
    select: ['id', 'name', 'handle'] 
  });
  
  console.log('=== EXISTING BRANDS ===\n');
  console.log('Total brands:', brands.length);
  
  // Show all brands
  brands.forEach(b => {
    console.log(`  ${b.name} (${b.handle}) - ${b.id}`);
  });
  
  return { count: brands.length };
}
