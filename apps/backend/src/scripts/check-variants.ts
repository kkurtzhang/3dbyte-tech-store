import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  // Get a few products and check their variants
  const products = await productModule.listProducts({}, { 
    select: ['id', 'handle', 'title'],
    take: 10 
  });
  
  console.log('=== VARIANT CHECK ===\n');
  
  for (const product of products) {
    const variants = await productModule.listProductVariants({ 
      product_id: product.id 
    });
    console.log(`${product.handle}`);
    console.log(`  Variants: ${variants.length}`);
    variants.forEach(v => {
      console.log(`    - ${v.title || 'no title'} (${v.sku || 'no sku'})`);
    });
  }
  
  return { checked: products.length };
}
