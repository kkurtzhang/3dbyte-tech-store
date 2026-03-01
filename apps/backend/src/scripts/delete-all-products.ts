import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

// Delete ALL products from Medusa - nuclear reset

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  console.log('=== DELETING ALL PRODUCTS ===\n');
  
  // Get all products
  const products = await productModule.listProducts({}, { 
    select: ['id', 'handle'] 
  });
  
  console.log(`Found ${products.length} products to delete\n`);
  
  // Delete in batches
  const batchSize = 50;
  let deleted = 0;
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const ids = batch.map(p => p.id);
    
    try {
      await productModule.deleteProducts(ids);
      deleted += batch.length;
      console.log(`Deleted ${deleted}/${products.length}`);
    } catch (e: any) {
      console.log(`Error deleting batch: ${e.message}`);
    }
  }
  
  console.log(`\n=== COMPLETE ===`);
  console.log(`Deleted: ${deleted} products`);
  
  return { deleted };
}
