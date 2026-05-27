import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

const STRAPI_URL = (
  process.env.STRAPI_API_URL ||
  process.env.STRAPI_URL ||
  "http://localhost:1337"
).replace(/\/$/, "");
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN?.trim();

function getStrapiAuthHeaders(): { Authorization: string } {
  if (!STRAPI_TOKEN) {
    throw new Error("STRAPI_API_TOKEN is required to verify Strapi sync.");
  }

  return { Authorization: `Bearer ${STRAPI_TOKEN}` };
}

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
        headers: getStrapiAuthHeaders(),
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
