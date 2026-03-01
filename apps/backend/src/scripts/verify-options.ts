import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

// Verify that options are properly linked to variants

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  // Check a product with multiple variants
  const products = await productModule.listProducts({
    handle: "alpha-pcd-3d-printer-nozzle-polycrystalline-diamond-v6-prusa-k1c-k2p-qidi-plus4",
  });
  
  if (products.length === 0) {
    console.log('Product not found');
    return;
  }
  
  const product = products[0];
  console.log('Product:', product.title);
  console.log('Handle:', product.handle);
  
  // Get options
  const options = await productModule.listProductOptions({
    product_id: product.id,
  });
  
  console.log('\n=== OPTIONS ===');
  for (const opt of options) {
    console.log(`  ${opt.title} (${opt.id})`);
    
    // Get option values
    const values = await productModule.listProductOptionValues({
      option_id: opt.id,
    });
    console.log(`    Values: ${values.length}`);
    values.slice(0, 5).forEach(v => console.log(`      - ${v.value}`));
    if (values.length > 5) console.log(`      ... and ${values.length - 5} more`);
  }
  
  // Get variants
  const variants = await productModule.listProductVariants({
    product_id: product.id,
  });
  
  console.log('\n=== VARIANTS ===');
  console.log(`Total: ${variants.length}`);
  
  for (const v of variants.slice(0, 5)) {
    console.log(`\n  ${v.title} (${v.sku})`);
    // Check if variant has options
    const variantWithOptions = v as any;
    if (variantWithOptions.options) {
      console.log(`    options: ${JSON.stringify(variantWithOptions.options)}`);
    } else {
      console.log(`    options: (none set)`);
    }
  }
  
  return { product: product.handle, options: options.length, variants: variants.length };
}
