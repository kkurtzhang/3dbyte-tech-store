import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const remoteQuery = container.resolve(ContainerRegistrationKeys.QUERY);
  
  // Check products with their sales channels
  const result = await remoteQuery.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "sales_channels.id",
      "sales_channels.name",
    ],
    pagination: { take: 10 },
  });
  
  console.log('=== CHECKING SALES CHANNELS ===\n');
  
  const products = result.data || [];
  
  for (const p of products) {
    const channels = p.sales_channels || [];
    console.log(`${p.title?.substring(0, 40)}...`);
    if (channels.length > 0) {
      channels.forEach((c: any) => {
        console.log(`  → ${c.name || c.id}`);
      });
    } else {
      console.log(`  → NO SALES CHANNELS`);
    }
  }
  
  // Count products with/without sales channels
  const allProducts = await remoteQuery.graph({
    entity: "product",
    fields: ["id", "sales_channels.id"],
    pagination: { take: 2000 },
  });
  
  const withChannel = (allProducts.data || []).filter((p: any) => p.sales_channels?.length > 0);
  const withoutChannel = (allProducts.data || []).filter((p: any) => !p.sales_channels?.length);
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Products with sales channel: ${withChannel.length}`);
  console.log(`Products without sales channel: ${withoutChannel.length}`);
  
  return { withChannel: withChannel.length, withoutChannel: withoutChannel.length };
}
