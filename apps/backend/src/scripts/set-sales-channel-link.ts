import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

// Use Remote Link to properly link products to sales channels

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const remoteLink = container.resolve(ContainerRegistrationKeys.LINK);
  
  console.log('=== SETTING SALES CHANNELS VIA REMOTE LINK ===\n');
  
  // Get the Web Store sales channel
  const channels = await salesChannelModule.listSalesChannels({});
  console.log('Available sales channels:');
  channels.forEach((c: any) => console.log(`  - ${c.name} (${c.id})`));
  
  const webStore = channels.find((c: any) => 
    c.name?.toLowerCase().includes('web') || 
    c.name?.toLowerCase().includes('store') ||
    c.name?.toLowerCase() === 'default'
  );
  
  if (!webStore) {
    console.log('\n❌ No Web Store sales channel found');
    return { error: 'channel not found' };
  }
  
  console.log(`\nUsing: ${webStore.name} (${webStore.id})\n`);
  
  // Get all products
  const products = await productModule.listProducts({}, { select: ['id'] });
  console.log(`Products to link: ${products.length}\n`);
  
  let linked = 0;
  let errors = 0;
  
  for (const product of products) {
    try {
      // Use remote link to create the relationship
      await remoteLink.create({
        [Modules.PRODUCT]: {
          product_id: product.id,
        },
        [Modules.SALES_CHANNEL]: {
          sales_channel_id: webStore.id,
        },
      });
      
      linked++;
      
      if (linked % 100 === 0) {
        console.log(`  Progress: ${linked}/${products.length}`);
      }
    } catch (e: any) {
      // Link might already exist
      if (!e.message.includes('already exists')) {
        console.log(`  Error: ${e.message}`);
        errors++;
      } else {
        linked++;
      }
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Products linked: ${linked}`);
  console.log(`Errors: ${errors}`);
  
  return { linked, errors };
}
