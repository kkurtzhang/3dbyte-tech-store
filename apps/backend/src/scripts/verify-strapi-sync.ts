import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

const STRAPI_URL = "http://192.168.0.45:1337";
const STRAPI_TOKEN = "0fe54a2a66615700eca2265a6420ca9b7df81856eababd43c61b2fbac4608b3c48b3b7a771f79aade1c1e232bcf3191cf98981a9fa9c1295cd3873eeeb552191c4164a066bd4111c4d40de8ee1f29caf977d57d38b7bc08cf76d16e55519d635554ae04b0c632ac78d2765ccedfa3f2c999c68f924b731ff9c80a3791a441a47";

export default async function ({ container }: ExecArgs) {
  console.log("=== STRAPI-MEDUSA SYNC VERIFICATION ===\n");

  // 1. Get all Medusa products
  const productModule = container.resolve(Modules.PRODUCT);
  const medusaProducts = await productModule.listProducts({}, { take: 2000 });
  
  console.log(`Medusa products: ${medusaProducts.length}`);
  
  const medusaHandles = new Map<string, string>();
  const medusaIds = new Set<string>();
  
  medusaProducts.forEach(p => {
    medusaHandles.set(p.handle, p.id);
    medusaIds.add(p.id);
  });
  
  console.log(`Unique handles: ${medusaHandles.size}`);
  console.log(`Unique IDs: ${medusaIds.size}`);

  // 2. Fetch all Strapi product-descriptions
  console.log("\nFetching Strapi product-descriptions...\n");
  const allStrapiDescriptions: any[] = [];
  let page = 1;
  const pageSize = 100;
  
  while (true) {
    try {
      const url = `${STRAPI_URL}/api/product-descriptions?pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
      });
      
      if (!res.ok) {
        console.log(`Strapi error: ${res.status} ${res.statusText}`);
        break;
      }
      
      const data = await res.json();
      
      // Debug: show raw structure on first page
      if (page === 1) {
        console.log("Raw Strapi response structure:");
        console.log(JSON.stringify(data).substring(0, 500));
        console.log("\n");
      }
      
      if (!data.data || data.data.length === 0) break;
      
      allStrapiDescriptions.push(...data.data);
      console.log(`  Page ${page}: ${data.data.length} entries (total: ${allStrapiDescriptions.length})`);
      
      if (data.data.length < pageSize) break;
      page++;
    } catch (err: any) {
      console.log(`Error fetching Strapi: ${err.message}`);
      break;
    }
  }
  
  console.log(`\nTotal Strapi product-descriptions: ${allStrapiDescriptions.length}`);

  // 3. Analyze Strapi data structure
  if (allStrapiDescriptions.length > 0) {
    console.log("\n--- Strapi Entry Structure (first entry) ---");
    const first = allStrapiDescriptions[0];
    console.log("Keys:", Object.keys(first));
    console.log("Full entry:", JSON.stringify(first, null, 2).substring(0, 1000));
  }

  // 4. Check linking
  let withMedusaId = 0;
  let withHandle = 0;
  let matchedByHandle = 0;
  let matchedById = 0;
  
  const strapiHandles = new Set<string>();
  const strapiMedusaIds = new Set<string>();
  
  for (const desc of allStrapiDescriptions) {
    // Strapi v5 structure: data.attributes or direct properties
    const attrs = desc.attributes || desc;
    const medusaId = attrs.medusa_product_id;
    const handle = attrs.product_handle || attrs.productHandle;
    
    if (medusaId) {
      withMedusaId++;
      strapiMedusaIds.add(medusaId);
      if (medusaIds.has(medusaId)) matchedById++;
    }
    
    if (handle) {
      withHandle++;
      strapiHandles.add(handle);
      if (medusaHandles.has(handle)) matchedByHandle++;
    }
  }

  console.log("\n=== LINKING ANALYSIS ===");
  console.log(`Strapi entries with medusa_product_id: ${withMedusaId}`);
  console.log(`Strapi entries with product_handle: ${withHandle}`);
  console.log(`Matched by Medusa ID: ${matchedById}`);
  console.log(`Matched by handle: ${matchedByHandle}`);

  // 5. Summary
  console.log("\n=== FINAL SUMMARY ===");
  console.log(`Medusa products: ${medusaProducts.length}`);
  console.log(`Strapi descriptions: ${allStrapiDescriptions.length}`);
  console.log(`Missing descriptions: ${medusaProducts.length - allStrapiDescriptions.length}`);
  console.log(`Properly linked: ${Math.max(matchedById, matchedByHandle)}`);
  console.log(`Unlinked in Strapi: ${allStrapiDescriptions.length - Math.max(matchedById, matchedByHandle)}`);

  if (withMedusaId === 0 && withHandle === 0) {
    console.log("\n⚠️  CRITICAL: No linking fields found in Strapi!");
    console.log("The Strapi product-descriptions have no medusa_product_id or product_handle.");
    console.log("Action: Need to regenerate all descriptions with proper linking.");
  }
}
