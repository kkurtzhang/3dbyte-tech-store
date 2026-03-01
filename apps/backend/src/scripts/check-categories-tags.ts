import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const remoteQuery = container.resolve(ContainerRegistrationKeys.QUERY);
  
  // Get categories using remote query
  const categoriesResult = await remoteQuery.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "parent_category_id"],
    pagination: { take: 100 },
  });
  
  console.log('=== CATEGORIES ===');
  console.log(`Total categories: ${categoriesResult.data?.length || 0}`);
  (categoriesResult.data || []).slice(0, 10).forEach((c: any) => {
    console.log(`  - ${c.name || c.handle}`);
  });
  
  // Get products with category info
  const productsResult = await remoteQuery.graph({
    entity: "product",
    fields: ["id", "handle", "categories.id"],
    pagination: { take: 2000 },
  });
  
  const products = productsResult.data || [];
  const withCategory = products.filter((p: any) => p.categories?.length > 0);
  const withoutCategory = products.filter((p: any) => !p.categories?.length);
  
  console.log(`\n=== PRODUCTS ===`);
  console.log(`Total: ${products.length}`);
  console.log(`With category: ${withCategory.length}`);
  console.log(`Without category: ${withoutCategory.length}`);
  
  // Get tags
  const tagsResult = await remoteQuery.graph({
    entity: "product_tag",
    fields: ["id", "value"],
    pagination: { take: 100 },
  });
  
  console.log(`\n=== TAGS ===`);
  console.log(`Total tags: ${tagsResult.data?.length || 0}`);
  (tagsResult.data || []).slice(0, 10).forEach((t: any) => {
    console.log(`  - ${t.value}`);
  });
  
  return { 
    categories: categoriesResult.data?.length || 0, 
    productsTotal: products.length,
    productsWithCategory: withCategory.length,
    productsWithoutCategory: withoutCategory.length,
    tags: tagsResult.data?.length || 0 
  };
}
