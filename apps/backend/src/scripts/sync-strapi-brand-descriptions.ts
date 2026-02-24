import { ExecArgs } from "@medusajs/framework/types";

const STRAPI_URL = "http://192.168.0.45:1337";
const STRAPI_TOKEN = "0fe54a2a66615700eca2265a6420ca9b7df81856eababd43c61b2fbac4608b3c48b3b7a771f79aade1c1e232bcf3191cf98981a9fa9c1295cd3873eeeb552191c4164a066bd4111c4d40de8ee1f29caf977d57d38b7bc08cf76d16e55519d635554ae04b0c632ac78d2765ccedfa3f2c999c68f924b731ff9c80a3791a441a47";

// Generate SEO-friendly brand description
function generateBrandDescription(brand: any): { rich: string; seo_title: string; seo_description: string } {
  const name = brand.name || "Brand";
  
  // Brand-specific descriptions based on known brands
  const brandInfo: Record<string, { description: string; specialties: string[] }> = {
    "LDO": {
      description: "LDO Motors is a leading manufacturer of high-quality stepper motors and motion control components for 3D printers.",
      specialties: ["Voron-compatible motors", "precision stepper motors", "motion systems"]
    },
    "Creality": {
      description: "Creality is one of the world's largest 3D printer manufacturers, known for affordable and reliable FDM printers.",
      specialties: ["FDM 3D printers", "Ender series", "budget-friendly options"]
    },
    "E3D": {
      description: "E3D Online is a British company specializing in premium hotends and 3D printing components.",
      specialties: ["V6 hotends", "Revo system", "high-performance nozzles"]
    },
    "Bondtech": {
      description: "Bondtech is a Swedish company known for their dual-drive extruder technology.",
      specialties: ["dual-drive extruders", "precision feeding", "BMG series"]
    },
    "BIGTREETECH": {
      description: "BIGTREETECH (BTT) is a leading manufacturer of 3D printer mainboards and electronics.",
      specialties: ["mainboards", "touch screens", "SKR series"]
    },
    "Phaetus": {
      description: "Phaetus manufactures high-quality hotends and nozzles for FDM 3D printing.",
      specialties: ["hotends", "nozzles", "BMO system"]
    },
    "Trianglelab": {
      description: "Trianglelab produces quality 3D printing components at competitive prices.",
      specialties: ["hotends", "extruders", "budget alternatives"]
    },
    "Micro Swiss": {
      description: "Micro Swiss specializes in upgrade parts for Creality and other popular 3D printers.",
      specialties: ["all-metal hotends", "upgrade kits", "hardened nozzles"]
    },
    "Slice Engineering": {
      description: "Slice Engineering designs premium hotends and thermal components for advanced 3D printing.",
      specialties: ["Mosquito hotends", "Copperhead", "high-temperature"]
    },
    "Gulf Coast Robotics": {
      description: "Gulf Coast Robotics manufactures upgrade parts and components for 3D printers.",
      specialties: ["upgrade kits", "printer modifications", "quality components"]
    }
  };
  
  const info = brandInfo[name] || {
    description: `${name} is a trusted manufacturer of 3D printing components and accessories.`,
    specialties: ["quality components", "reliable performance"]
  };
  
  const rich = `<p>${info.description}</p>

<h3>About ${name}</h3>
<p>${name} products are designed for 3D printing enthusiasts who demand quality and reliability. Their components are engineered to exacting standards and tested for compatibility with popular printer models.</p>

<h3>Specialties</h3>
<ul>
${info.specialties.map(s => `<li>${s}</li>`).join("\n")}
</ul>

<p>Shop authentic ${name} products at 3DByte Tech - your trusted Australian source for quality 3D printing components.</p>`;

  const seo_title = `${name} Products | 3DByte Tech Australia`;
  const seo_description = `Shop genuine ${name} products at 3DByte Tech. ${info.description.substring(0, 100)} Fast shipping across Australia.`;

  return { rich, seo_title, seo_description };
}

export default async function ({ container }: ExecArgs) {
  console.log("=== SYNCING STRAPI BRAND DESCRIPTIONS ===\n");
  
  // Step 1: Fetch all Medusa brands
  const brandModule = container.resolve("brand" as any);
  const brands = await brandModule.listBrands({}, { take: 500 });
  
  console.log(`Found ${brands.length} brands in Medusa`);
  
  // Create lookup maps
  const brandIds = new Set(brands.map((b: any) => b.id));
  const brandHandles = new Map(brands.map((b: any) => [b.handle || b.name?.toLowerCase().replace(/\s+/g, "-"), b.id]));
  
  // Step 2: Fetch existing Strapi brand descriptions
  console.log("\nFetching existing Strapi brand descriptions...\n");
  const existingDescriptions: any[] = [];
  let page = 1;
  
  while (true) {
    const url = `${STRAPI_URL}/api/brand-descriptions?pagination[page]=${page}&pagination[pageSize]=100`;
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
  
  console.log(`Found ${existingDescriptions.length} existing Strapi brand descriptions`);
  
  // Debug: show structure of first entry
  if (existingDescriptions.length > 0) {
    console.log("\nSample Strapi entry structure:");
    const first = existingDescriptions[0];
    console.log("Keys:", Object.keys(first));
    console.log("Attributes:", first.medusa_brand_id ? "flat structure" : "nested in attributes");
  }
  
  // Step 3: Identify which brands have descriptions
  const brandsWithDescriptions = new Set<string>();
  const orphanedDescriptions: any[] = [];
  
  for (const desc of existingDescriptions) {
    // Strapi v5 flat structure
    const medusaId = desc.medusa_brand_id || desc.attributes?.medusa_brand_id;
    const brandName = desc.brand_name || desc.attributes?.brand_name;
    const handle = desc.brand_handle || desc.attributes?.brand_handle;
    
    if (medusaId && brandIds.has(medusaId)) {
      brandsWithDescriptions.add(medusaId);
    } else {
      orphanedDescriptions.push(desc);
    }
  }
  
  console.log(`\nBrands with valid descriptions: ${brandsWithDescriptions.size}`);
  console.log(`Orphaned descriptions to delete: ${orphanedDescriptions.length}`);
  
  // Step 4: Delete orphaned descriptions
  if (orphanedDescriptions.length > 0) {
    console.log("\nDeleting orphaned brand descriptions...\n");
    let deleted = 0;
    
    for (const desc of orphanedDescriptions) {
      const documentId = desc.documentId || desc.id;
      if (!documentId) continue;
      
      try {
        const res = await fetch(`${STRAPI_URL}/api/brand-descriptions/${documentId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
        });
        
        if (res.ok) {
          deleted++;
          if (deleted % 20 === 0) {
            console.log(`  Deleted: ${deleted}/${orphanedDescriptions.length}`);
          }
        }
      } catch (e) {
        // Continue on error
      }
      
      await new Promise(r => setTimeout(r, 50));
    }
    
    console.log(`\nDeleted ${deleted} orphaned brand descriptions\n`);
  }
  
  // Step 5: Create descriptions for brands that don't have one
  const brandsNeedingDescriptions = brands.filter((b: any) => !brandsWithDescriptions.has(b.id));
  
  console.log(`Brands needing descriptions: ${brandsNeedingDescriptions.length}\n`);
  
  if (brandsNeedingDescriptions.length === 0) {
    console.log("✅ All brands already have descriptions!");
    return;
  }
  
  console.log("Creating new brand descriptions...\n");
  
  let created = 0;
  let failed = 0;
  
  for (let i = 0; i < brandsNeedingDescriptions.length; i++) {
    const brand = brandsNeedingDescriptions[i];
    const { rich, seo_title, seo_description } = generateBrandDescription(brand);
    
    const handle = brand.handle || brand.name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    
    const payload = {
      data: {
        medusa_brand_id: brand.id,
        brand_name: brand.name,
        brand_handle: handle,
        rich_description: rich,
        seo_title: seo_title.substring(0, 70),
        seo_description: seo_description.substring(0, 160),
        sync_status: "synced",
      }
    };
    
    try {
      const res = await fetch(`${STRAPI_URL}/api/brand-descriptions`, {
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
        console.log(`  ✅ ${brand.name}`);
      } else {
        failed++;
        console.log(`  ❌ ${brand.name}: ${data.error?.message || JSON.stringify(data).substring(0, 100)}`);
      }
    } catch (err: any) {
      failed++;
      console.log(`  ❌ ${brand.name}: ${err.message}`);
    }
    
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log("\n=== FINAL SUMMARY ===");
  console.log(`Total brands: ${brands.length}`);
  console.log(`Already had descriptions: ${brandsWithDescriptions.size}`);
  console.log(`New descriptions created: ${created}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total with descriptions: ${brandsWithDescriptions.size + created}`);
}
