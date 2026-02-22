import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const products = await productModule.listProducts({}, { select: ['id', 'handle', 'external_id', 'metadata'] });
  
  console.log('Total products in Medusa:', products.length);
  console.log('\nSample products (first 10):');
  products.slice(0, 10).forEach(p => {
    console.log(`  - ${p.handle} (external_id: ${p.external_id || 'none'})`);
  });
  
  // Get all external_ids (DREMC IDs)
  const dremcIds = products
    .filter(p => p.external_id)
    .map(p => String(p.external_id));
  
  console.log('\nProducts with DREMC external_id:', dremcIds.length);
  
  // Return for use in sync
  return products.map(p => ({
    id: p.id,
    handle: p.handle,
    external_id: p.external_id,
    dremc_id: p.metadata?.dremc_id
  }));
}
