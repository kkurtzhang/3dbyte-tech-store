import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

// Test script to understand Medusa v2 variant option linking

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  // Get a product with multiple variants
  const products = await productModule.listProducts({
    handle: 'hotend-kit-for-sprite-extruder',
  });
  
  if (products.length === 0) {
    console.log('Product not found');
    return;
  }
  
  const product = products[0];
  console.log('Product:', product.handle);
  
  // Get options
  const options = await productModule.listProductOptions({
    product_id: product.id,
  });
  
  console.log('\nOptions:', options.length);
  options.forEach(o => console.log(`  - ${o.id}: ${o.title}`));
  
  // Get variants
  const variants = await productModule.listProductVariants({
    product_id: product.id,
  });
  
  console.log('\nVariants:', variants.length);
  for (const v of variants) {
    console.log(`  - ${v.id}: ${v.title}`);
    console.log(`    options:`, JSON.stringify((v as any).options, null, 2));
    console.log(`    option_values:`, JSON.stringify((v as any).option_values, null, 2));
  }
  
  // If we have an option but variants aren't linked, let's try to link them
  if (options.length > 0 && variants.length > 1) {
    const option = options[0];
    console.log('\n\nAttempting to link variants to option values...');
    
    for (const variant of variants) {
      try {
        // Try using option_values format
        const result = await productModule.updateProductVariants(variant.id, {
          options: {
            [option.id]: variant.title,
          },
        } as any);
        console.log(`  ✅ Updated ${variant.title}`);
      } catch (e: any) {
        console.log(`  ❌ Failed ${variant.title}: ${e.message}`);
      }
    }
  }
  
  return { done: true };
}
