import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const remoteQuery = container.resolve(ContainerRegistrationKeys.QUERY);
  
  const result = await remoteQuery.graph({
    entity: "product",
    fields: ["id", "options.id", "options.title", "images.id"],
    pagination: { take: 2000 },
  });
  
  const products = result.data || [];
  const withOptions = products.filter((p: any) => p.options?.length > 0);
  const withImages = products.filter((p: any) => p.images?.length > 0);
  
  // Get unique option titles
  const optionTitles = new Set<string>();
  products.forEach((p: any) => {
    (p.options || []).forEach((o: any) => optionTitles.add(o.title));
  });
  
  console.log('=== IMPORT STATUS ===\n');
  console.log(`Total products: ${products.length}`);
  console.log(`With options: ${withOptions.length}`);
  console.log(`With images: ${withImages.length}`);
  console.log(`\nOption titles in use:`);
  Array.from(optionTitles).sort().forEach(t => console.log(`  - ${t}`));
  
  return { total: products.length, withOptions: withOptions.length, withImages: withImages.length };
}
