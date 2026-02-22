import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

// Test updating a single product with tags

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  const products = await productModule.listProducts({
    handle: 'vzbots-mellow-watercooling-plate-nema17-by-mellow3d',
  }, { select: ['id'] });
  
  if (products.length === 0) {
    console.log('Product not found');
    return {};
  }
  
  const product = products[0];
  const tags = ['3D', 'Stepper Motor'];
  
  console.log('Testing tag update...');
  console.log(`  Product ID: ${product.id}`);
  console.log(`  Tags to add: ${JSON.stringify(tags)}`);
  console.log(`  Tags type: ${typeof tags}, array: ${Array.isArray(tags)}`);
  
  try {
    // Try format 1: array of objects with value
    const result = await productModule.updateProducts(product.id, {
      tags: tags.map(t => ({ value: t })),
    } as any);
    console.log('✅ Format 1 worked!');
  } catch (e: any) {
    console.log(`❌ Format 1 failed: ${e.message}`);
    
    // Try format 2: array of strings directly
    try {
      await productModule.updateProducts(product.id, {
        tags: tags,
      } as any);
      console.log('✅ Format 2 worked!');
    } catch (e2: any) {
      console.log(`❌ Format 2 failed: ${e2.message}`);
    }
  }
  
  return {};
}
