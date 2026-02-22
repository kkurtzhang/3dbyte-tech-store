import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

// Set all products to Web Store sales channel

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  // Try to get sales channel module
  let salesChannelModule: any = null;
  try {
    salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  } catch (e) {
    console.log('Sales channel module not available');
    return { error: 'module not available' };
  }
  
  // Get Web Store sales channel
  const channels = await salesChannelModule.listSalesChannels({});
  const webStore = channels.find((c: any) => 
    c.name?.toLowerCase().includes('web') || 
    c.name?.toLowerCase().includes('store') ||
    c.name?.toLowerCase() === 'default'
  );
  
  if (!webStore) {
    console.log('No Web Store sales channel found');
    console.log('Available channels:', channels.map((c: any) => c.name).join(', '));
    return { error: 'channel not found' };
  }
  
  console.log(`Found sales channel: ${webStore.name} (${webStore.id})`);
  
  // Get all products
  const products = await productModule.listProducts({}, { select: ['id'] });
  console.log(`Found ${products.length} products\n`);
  
  // Link products to sales channel
  let linked = 0;
  
  for (const product of products) {
    try {
      await productModule.updateProducts(product.id, {
        sales_channels: [{ id: webStore.id }],
      } as any);
      linked++;
      
      if (linked % 100 === 0) {
        console.log(`  Progress: ${linked}/${products.length}`);
      }
    } catch (e: any) {
      console.log(`  Error: ${e.message}`);
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Products linked to ${webStore.name}: ${linked}`);
  
  return { linked };
}
