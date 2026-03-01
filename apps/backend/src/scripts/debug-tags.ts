import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  // Get one specific product
  const products = await productModule.listProducts({
    handle: 'vzbots-mellow-watercooling-plate-nema17-by-mellow3d',
  }, { select: ['id', 'handle', 'metadata'] });
  
  if (products.length > 0) {
    const p = products[0];
    console.log('Product in Medusa:');
    console.log(`  Handle: ${p.handle}`);
    console.log(`  Metadata: ${JSON.stringify(p.metadata)}`);
    console.log(`  dremc_id type: ${typeof p.metadata?.dremc_id}`);
  } else {
    console.log('Product not found');
  }
  
  return {};
}
