import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

// Use remote query to get variant options

export default async function ({ container }: ExecArgs) {
  const remoteQuery = container.resolve(ContainerRegistrationKeys.QUERY);
  
  // Query a product with its variants and options
  const result = await remoteQuery.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "options.id",
      "options.title",
      "options.values.id",
      "options.values.value",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.options.*",  // Try to get variant options
    ],
    filters: {
      handle: "alpha-pcd-3d-printer-nozzle-polycrystalline-diamond-v6-prusa-k1c-k2p-qidi-plus4",
    },
  });
  
  console.log('=== PRODUCT WITH OPTIONS ===\n');
  
  if (!result.data || result.data.length === 0) {
    console.log('Product not found');
    return;
  }
  
  const product = result.data[0];
  console.log('Product:', product.title);
  console.log('\nOptions:');
  
  for (const opt of product.options || []) {
    console.log(`  ${opt.title} (${opt.id})`);
    console.log(`    Values: ${(opt.values || []).length}`);
    for (const v of (opt.values || []).slice(0, 5)) {
      console.log(`      - ${v.value}`);
    }
  }
  
  console.log('\nVariants:');
  for (const v of (product.variants || []).slice(0, 3)) {
    console.log(`  ${v.title}`);
    console.log(`    options: ${JSON.stringify(v.options)}`);
  }
  
  console.log('\n=== RAW RESULT ===');
  console.log(JSON.stringify(result, null, 2).substring(0, 3000));
  
  return result;
}
