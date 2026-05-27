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
    throw new Error(
      "STRAPI_API_TOKEN is required to regenerate Strapi descriptions.",
    );
  }

  return { Authorization: `Bearer ${STRAPI_TOKEN}` };
}

// Generate SEO-friendly description based on product data
function generateDescription(product: any): { rich: string; seo_title: string; seo_description: string } {
  const title = product.title || "3D Printing Product";
  const brand = product.metadata?.vendor || "";
  
  // Detect product category from title/tags
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
  
  // Add brand-specific features
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

async function deleteAllStrapiDescriptions(): Promise<number> {
  console.log("Deleting all existing Strapi product-descriptions...\n");
  
  let deleted = 0;
  let page = 1;
  
  while (true) {
    // Fetch a batch
    const url = `${STRAPI_URL}/api/product-descriptions?pagination[page]=${page}&pagination[pageSize]=100&fields[0]=id`;
    const res = await fetch(url, {
      headers: getStrapiAuthHeaders()
    });
    
    if (!res.ok) {
      console.log(`Error fetching: ${res.status}`);
      break;
    }
    
    const data = await res.json();
    if (!data.data || data.data.length === 0) break;
    
    // Delete each entry
    for (const entry of data.data) {
      const deleteUrl = `${STRAPI_URL}/api/product-descriptions/${entry.id}`;
      const delRes = await fetch(deleteUrl, {
        method: "DELETE",
        headers: getStrapiAuthHeaders()
      });
      
      if (delRes.ok) {
        deleted++;
      }
    }
    
    console.log(`  Deleted batch ${page}: ${data.data.length} entries (total: ${deleted})`);
    
    // If less than 100, we're done
    if (data.data.length < 100) break;
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }
  
  return deleted;
}

async function createStrapiDescription(product: any): Promise<boolean> {
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
        ...getStrapiAuthHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    if (data.data?.id || data.documentId) {
      return true;
    } else {
      console.log(`  ❌ Failed: ${product.handle} - ${data.error?.message || JSON.stringify(data).substring(0, 100)}`);
      return false;
    }
  } catch (err: any) {
    console.log(`  ❌ Error: ${product.handle} - ${err.message}`);
    return false;
  }
}

export default async function ({ container }: ExecArgs) {
  console.log("=== REGENERATING STRAPI PRODUCT DESCRIPTIONS ===\n");
  
  // Step 1: Delete all existing descriptions
  const deleted = await deleteAllStrapiDescriptions();
  console.log(`\n✅ Deleted ${deleted} orphaned descriptions\n`);
  
  // Step 2: Fetch all Medusa products
  const productModule = container.resolve(Modules.PRODUCT);
  const products = await productModule.listProducts({}, { take: 2000 });
  
  console.log(`Found ${products.length} products in Medusa\n`);
  console.log("Creating new Strapi descriptions...\n");
  
  // Step 3: Create descriptions for each product
  let created = 0;
  let failed = 0;
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const success = await createStrapiDescription(product);
    
    if (success) {
      created++;
    } else {
      failed++;
    }
    
    // Progress every 50
    if ((i + 1) % 50 === 0) {
      console.log(`  Progress: ${i + 1}/${products.length} (${created} created, ${failed} failed)`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log("\n=== FINAL SUMMARY ===");
  console.log(`Total products: ${products.length}`);
  console.log(`Created: ${created}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((created / products.length) * 100).toFixed(1)}%`);
}
