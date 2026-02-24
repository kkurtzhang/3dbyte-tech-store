import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  // Sample handles from Strapi that should match
  const testHandles = [
    "2m-capricorn-xs-ptfe-tube-1-9mmx4mm-for-3d-printers",
    "cnc-kitchen-metric-threaded-insert",
    "phatetus-xh-microswiss-revo-micro-hotend",
  ];
  
  console.log("Checking if Strapi handles exist in Medusa:\n");
  
  for (const handle of testHandles) {
    const products = await productModule.listProducts({ handle });
    if (products.length > 0) {
      console.log(`✅ ${handle}`);
      console.log(`   Medusa ID: ${products[0].id}`);
    } else {
      console.log(`❌ ${handle} - NOT FOUND`);
    }
  }
  
  // Check the medusa_product_id from Strapi
  const strapiProductId = "prod_01KHSTHFB06QN2F7RSNZZSW20A"; // from first Strapi entry
  console.log(`\n\nChecking if Strapi's medusa_product_id exists in Medusa:`);
  console.log(`Looking for: ${strapiProductId}`);
  
  const byId = await productModule.listProducts({ id: [strapiProductId] });
  if (byId.length > 0) {
    console.log(`✅ Found: ${byId[0].title}`);
  } else {
    console.log(`❌ NOT FOUND - This product ID no longer exists in Medusa`);
  }
}
