import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

// Try creating tags first, then linking

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  // First, try creating tags directly
  console.log('Testing tag creation...\n');
  
  try {
    // Try creating tags first
    const tags = await productModule.createProductTags([
      { value: 'test-tag-1' },
      { value: 'test-tag-2' },
    ]);
    console.log(`✅ Created ${tags.length} tags`);
    console.log('Tags:', JSON.stringify(tags.map(t => ({ id: t.id, value: t.value }))));
    
    // Now try linking to a product
    const products = await productModule.listProducts({}, { select: ['id'], take: 1 });
    if (products.length > 0) {
      const product = products[0];
      console.log(`\nLinking tags to product ${product.id}...`);
      
      await productModule.updateProducts(product.id, {
        tags: tags.map(t => ({ id: t.id })),
      } as any);
      console.log('✅ Linked tags by ID!');
    }
  } catch (e: any) {
    console.log(`❌ Error: ${e.message}`);
  }
  
  return {};
}
