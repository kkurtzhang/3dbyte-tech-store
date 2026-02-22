import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  const products = await productModule.listProducts({}, { 
    select: ['id', 'handle', 'metadata'],
    take: 20 
  });
  
  console.log('=== PRODUCT METADATA SAMPLE ===\n');
  
  products.forEach(p => {
    console.log(`${p.handle}`);
    console.log(`  metadata: ${JSON.stringify(p.metadata)}`);
    console.log('');
  });
  
  return { count: products.length };
}
