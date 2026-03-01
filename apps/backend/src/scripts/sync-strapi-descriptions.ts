import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

const STRAPI_URL = "http://192.168.0.45:1337";
const STRAPI_TOKEN = "0fe54a2a66615700eca2265a6420ca9b7df81856eababd43c61b2fbac4608b3c48b3b7a771f79aade1c1e232bcf3191cf98981a9fa9c1295cd3873eeeb552191c4164a066bd4111c4d40de8ee1f29caf977d57d38b7bc08cf76d16e55519d635554ae04b0c632ac78d2765ccedfa3f2c999c68f924b731ff9c80a3791a441a47";

// Generate SEO-friendly description based on product data
function generateDescription(product: any): { rich: string; seo_title: string; seo_description: string } {
  const title = product.title || "3D Printing Product";
  const brand = product.metadata?.vendor || "";
  
  // Detect product category from title
  const titleLower = title.toLowerCase();
  let category = "3D printing component";
  let features: string[] = [];
  
  if (titleLower.includes("nozzle")) {
    category = "3D printer nozzle";
    features = ["precise filament extrusion", "high-temperature resistance", "optimal print quality"];
  } else if (titleLower.includes("hotend")) {
    category = "hotend assembly";
    features = ["efficient heat dissipation", "consistent temperature control", "smooth filament flow"];
  } else if (titleLower.includes("filament") || titleLower.includes("pla") || titleLower.includes("petg") || titleLower.includes("tpu")) {
    category = "3D printing filament";
    features = ["consistent diameter", "vibrant color output", "reliable print performance"];
  } else if (titleLower.includes("extruder")) {
    category = "extruder component";
    features = ["reliable filament feeding", "precise control", "reduced slipping"];
  } else if (titleLower.includes("ptfe") || titleLower.includes("tube")) {
    category = "PTFE tube";
    features = ["low friction", "heat resistance", "smooth filament guidance"];
  } else if (titleLower.includes("motor") || titleLower.includes("stepper")) {
    category = "stepper motor";
    features = ["precise movement", "quiet operation", "long lifespan"];
  } else if (titleLower.includes("belt") || titleLower.includes("linear")) {
    category = "motion component";
    features = ["smooth operation", "minimal wear", "precise positioning"];
  } else if (titleLower.includes("thermistor") || titleLower.includes("heater")) {
    category = "temperature component";
    features = ["accurate temperature sensing", "fast response", "reliable performance"];
  } else if (titleLower.includes("insert") || titleLower.includes("nut")) {
    category = "hardware component";
    features = ["strong thread engagement", "heat-set installation", "durable construction"];
  } else if (titleLower.includes("display") || titleLower.includes("screen")) {
    category = "display component";
    features = ["clear visibility", "touch responsive", "easy integration"];
  } else if (titleLower.includes("board") || titleLower.includes("mainboard") || titleLower.includes("skr")) {
    category = "mainboard";
    features = ["fast processing", "expandable connectivity", "silent drivers"];
  }
  
  if (brand) {
    features.push(`genuine ${brand} quality`);
  }
  
  const featureText = features.length > 0 
    ? features.map(f => `<li>${f}</li>`).join("")
    : "<li>Quality construction</li><li>Reliable performance</li>";
  
  const rich = `<p>The <strong>${title}</strong>${brand ? ` by ${brand}` : ""} is a premium ${category} designed for 3D printing enthusiasts and professionals.</p>

<h3>Key Features</h3>
<ul>
${featureText}
</ul>

<p>This product is ideal for upgrading or maintaining your 3D printer, ensuring optimal print quality and reliability. Compatible with popular printer models and easy to install.</p>

<p>Shop with confidence at 3DByte Tech - your trusted source for quality 3D printing components.</p>`;

  const seo_title = brand 
    ? `${brand} ${title.substring(0, 50)} | 3DByte Tech`
    : `${title.substring(0, 60)} | 3DByte Tech`;
    
  const seo_description = `Shop the ${title.substring(0, 40)}${brand ? ` from ${brand}` : ""} at 3DByte Tech. Quality ${category} with fast shipping across Australia. Expert support available.`;

  return { rich, seo_title, seo_description };
}

export default async function ({ container }: ExecArgs) {
  console.log("=== CREATING STRAPI PRODUCT DESCRIPTIONS ===\n");
  
  // Step 1: Fetch all Medusa products
  const productModule = container.resolve(Modules.PRODUCT);
  const products = await productModule.listProducts({}, { take: 2000 });
  
  console.log(`Found ${products.length} products in Medusa`);
  
  // Create a set of product IDs for quick lookup
  const productIds = new Set(products.map(p => p.id));
  const productHandles = new Map(products.map(p => [p.handle, p.id]));
  
  // Step 2: Fetch existing Strapi descriptions
  console.log("\nFetching existing Strapi descriptions...\n");
  const existingDescriptions: any[] = [];
  let page = 1;
  
  while (true) {
    const url = `${STRAPI_URL}/api/product-descriptions?pagination[page]=${page}&pagination[pageSize]=100`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
    });
    
    if (!res.ok) break;
    const data = await res.json();
    if (!data.data || data.data.length === 0) break;
    
    existingDescriptions.push(...data.data);
    if (data.data.length < 100) break;
    page++;
  }
  
  console.log(`Found ${existingDescriptions.length} existing Strapi descriptions`);
  
  // Step 3: Identify which products need descriptions
  const productsWithDescriptions = new Set<string>();
  const orphanedDescriptions: any[] = [];
  
  for (const desc of existingDescriptions) {
    const attrs = desc.attributes || desc;
    const medusaId = attrs.medusa_product_id;
    const handle = attrs.product_handle;
    
    if (medusaId && productIds.has(medusaId)) {
      productsWithDescriptions.add(medusaId);
    } else if (handle && productHandles.has(handle)) {
      productsWithDescriptions.add(productHandles.get(handle)!);
    } else {
      orphanedDescriptions.push(desc);
    }
  }
  
  console.log(`Products with valid descriptions: ${productsWithDescriptions.size}`);
  console.log(`Orphaned descriptions to delete: ${orphanedDescriptions.length}`);
  
  // Step 4: Delete orphaned descriptions using documentId
  if (orphanedDescriptions.length > 0) {
    console.log("\nDeleting orphaned descriptions...\n");
    let deleted = 0;
    
    for (const desc of orphanedDescriptions) {
      const documentId = desc.documentId || desc.id;
      if (!documentId) continue;
      
      try {
        const res = await fetch(`${STRAPI_URL}/api/product-descriptions/${documentId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
        });
        
        if (res.ok) {
          deleted++;
          if (deleted % 100 === 0) {
            console.log(`  Deleted: ${deleted}/${orphanedDescriptions.length}`);
          }
        }
      } catch (e) {
        // Continue on error
      }
      
      await new Promise(r => setTimeout(r, 20));
    }
    
    console.log(`\nDeleted ${deleted} orphaned descriptions\n`);
  }
  
  // Step 5: Create descriptions for products that don't have one
  const productsNeedingDescriptions = products.filter(p => !productsWithDescriptions.has(p.id));
  
  console.log(`Products needing descriptions: ${productsNeedingDescriptions.length}\n`);
  
  if (productsNeedingDescriptions.length === 0) {
    console.log("✅ All products already have descriptions!");
    return;
  }
  
  console.log("Creating new descriptions...\n");
  
  let created = 0;
  let failed = 0;
  
  for (let i = 0; i < productsNeedingDescriptions.length; i++) {
    const product = productsNeedingDescriptions[i];
    const { rich, seo_title, seo_description } = generateDescription(product);
    
    const payload = {
      data: {
        medusa_product_id: product.id,
        product_handle: product.handle,
        product_title: product.title,
        rich_description: rich,
        seo_title: seo_title.substring(0, 70),
        seo_description: seo_description.substring(0, 160),
        sync_status: "synced",
      }
    };
    
    try {
      const res = await fetch(`${STRAPI_URL}/api/product-descriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRAPI_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.data?.id || data.documentId) {
        created++;
      } else {
        failed++;
        if (failed <= 5) {
          console.log(`  ❌ ${product.handle}: ${data.error?.message || 'unknown error'}`);
        }
      }
    } catch (err: any) {
      failed++;
    }
    
    // Progress every 50
    if ((i + 1) % 50 === 0) {
      console.log(`  Progress: ${i + 1}/${productsNeedingDescriptions.length} (${created} created, ${failed} failed)`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 30));
  }
  
  console.log("\n=== FINAL SUMMARY ===");
  console.log(`Total products: ${products.length}`);
  console.log(`Already had descriptions: ${productsWithDescriptions.size}`);
  console.log(`New descriptions created: ${created}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total with descriptions: ${productsWithDescriptions.size + created}`);
}
