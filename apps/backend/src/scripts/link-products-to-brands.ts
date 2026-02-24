import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { BRAND_MODULE } from "../modules/brand";

// Vendor name to brand name mapping (for mismatches)
const VENDOR_TO_BRAND: Record<string, string> = {
  "BIGTREETECH": "BIGTREETECH",
  "BTT": "BIGTREETECH",
  "BTT (BigTreeTech)": "BIGTREETECH",
  "Creality": "Creality",
  "CREALITY": "Creality",
  "LDO": "LDO",
  "LDO Motors": "LDO",
  "Trianglelab": "Trianglelab",
  "Triangle Lab": "Trianglelab",
  "Micro Swiss": "Micro Swiss",
  "MicroSwiss": "Micro Swiss",
  "MICRO SWISS": "Micro Swiss",
  "Fysetc": "Fysetc",
  "FYSETC": "Fysetc",
  "E3D": "E3D",
  "E3D-Online": "E3D",
  "E3D Online": "E3D",
  "Bondtech": "Bondtech",
  "BONDTECH": "Bondtech",
  "Phaetus": "Phaetus",
  "PHAETUS": "Phaetus",
  "Sovol": "Sovol",
  "SOVOL": "Sovol",
  "Anycubic": "Anycubic",
  "ANYCUBIC": "Anycubic",
  "Slice Engineering": "Slice Engineering",
  "SLICE ENGINEERING": "Slice Engineering",
  "Gates": "Gates",
  "GATES": "Gates",
  "CNC Kitchen": "CNC Kitchen",
  "CNC KITCHEN": "CNC Kitchen",
  "QIDI TECH": "QIDI TECH",
  "Qidi": "QIDI TECH",
  "QIDI": "QIDI TECH",
  "Duet3D": "Duet3D",
  "DUET3D": "Duet3D",
  "Mellow3D": "Mellow3D",
  "MELLOW3D": "Mellow3D",
  "Fabreeko": "Fabreeko",
  "FABREEKO": "Fabreeko",
  "Flashforge": "Flashforge",
  "FLASHFORGE": "Flashforge",
  "Molex": "Molex",
  "MOLEX": "Molex",
  "GDSTIME": "GDSTIME",
  "West3D": "West3D",
  "WEST3D": "West3D",
  "Mean Well": "Mean Well",
  "MEAN WELL": "Mean Well",
  "DEVIL DESIGN": "DEVIL DESIGN",
  "Cartographer3D": "Cartographer3D",
  "CARTOGRAPHER3D": "Cartographer3D",
  "Cookiecad": "Cookiecad",
  "COOKIECAD": "Cookiecad",
  "Pine64": "Pine64",
  "PINE64": "Pine64",
  "Omron": "Omron",
  "OMRON": "Omron",
  "MISUMI": "MISUMI",
  "Vector 3D": "Vector 3D",
  "VECTOR 3D": "Vector 3D",
  "Sunon": "Sunon",
  "SUNON": "Sunon",
  "AG": "AG",
  "Capricorn": "Capricorn",
  "CAPRICORN": "Capricorn",
  "Miniware": "Miniware",
  "MINIWARE": "Miniware",
  "Wago": "Wago",
  "WAGO": "Wago",
  "ANTCLABS": "ANTCLABS",
  "Polymaker": "Polymaker",
  "POLYMAKER": "Polymaker",
  "eSun": "eSun",
  "ESUN": "eSun",
  "Keenovo": "Keenovo",
  "KEENOVO": "Keenovo",
  "Proto Pasta": "Proto Pasta",
  "PROTO PASTA": "Proto Pasta",
  "Magigoo": "Magigoo",
  "MAGIGOO": "Magigoo",
  "Artillery 3D": "Artillery 3D",
  "ARTILLERY 3D": "Artillery 3D",
  "Elegoo": "Elegoo",
  "ELEGOO": "Elegoo",
  "IGUS": "IGUS",
  "NSK": "NSK",
  "HIWIN": "HIWIN",
  "TBI Motion": "TBI Motion",
  "TBI MOTION": "TBI Motion",
  "Luke's Laboratory": "Luke's Laboratory",
  "Moons": "Moons",
  "Adam Tech": "Adam Tech",
  "Delta Electronics": "Delta Electronics",
  "AJAX": "AJAX",
  "Ember Prototypes": "Ember Prototypes",
  "MY3Dtech": "MY3Dtech",
  "Schallenkammer": "Schallenkammer",
};

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const brandModule = container.resolve(BRAND_MODULE);
  const link = container.resolve("link");
  const logger = container.resolve("logger");

  console.log("=== LINKING PRODUCTS TO BRANDS ===\n");

  // Step 1: Get all brands
  const brands = await brandModule.listBrands({}, { take: 500 });
  const brandByName = new Map<string, typeof brands[0]>();
  const brandByHandle = new Map<string, typeof brands[0]>();
  
  for (const brand of brands) {
    brandByName.set(brand.name.toLowerCase(), brand);
    if (brand.handle) {
      brandByHandle.set(brand.handle.toLowerCase(), brand);
    }
  }
  
  console.log(`Found ${brands.length} brands\n`);

  // Step 2: Get all products
  const products = await productModule.listProducts({}, { take: 3000 });
  console.log(`Found ${products.length} products\n`);

  // Step 3: Check existing links first
  console.log("Checking existing product-brand links...\n");
  const existingLinks = new Set<string>();
  
  // We need to check links via the remote link
  // For now, we'll just try to create all links and catch duplicates
  
  // Step 4: Link products to brands
  let linked = 0;
  let alreadyLinked = 0;
  let noMatch = 0;
  const noMatchVendors = new Map<string, number>();

  const linksToCreate: any[] = [];

  for (const product of products) {
    const vendor = product.metadata?.vendor as string;
    
    if (!vendor) {
      noMatchVendors.set("(no vendor)", (noMatchVendors.get("(no vendor)") || 0) + 1);
      noMatch++;
      continue;
    }

    // Try to find matching brand
    let brand = brandByName.get(vendor.toLowerCase());
    
    // Try mapping if direct match fails
    if (!brand) {
      const mappedName = VENDOR_TO_BRAND[vendor] || VENDOR_TO_BRAND[vendor.toLowerCase()];
      if (mappedName) {
        brand = brandByName.get(mappedName.toLowerCase());
      }
    }
    
    // Try partial match
    if (!brand) {
      for (const [name, b] of brandByName) {
        if (name.includes(vendor.toLowerCase()) || vendor.toLowerCase().includes(name)) {
          brand = b;
          break;
        }
      }
    }

    if (brand) {
      linksToCreate.push({
        [Modules.PRODUCT]: { product_id: product.id },
        [BRAND_MODULE]: { brand_id: brand.id },
      });
    } else {
      noMatchVendors.set(vendor, (noMatchVendors.get(vendor) || 0) + 1);
      noMatch++;
    }
  }

  console.log(`Products to link: ${linksToCreate.length}`);
  console.log(`Products without match: ${noMatch}\n`);

  // Step 5: Create all links in batches
  if (linksToCreate.length > 0) {
    console.log("Creating product-brand links...\n");
    
    const BATCH_SIZE = 100;
    for (let i = 0; i < linksToCreate.length; i += BATCH_SIZE) {
      const batch = linksToCreate.slice(i, i + BATCH_SIZE);
      
      try {
        await link.create(batch);
        linked += batch.length;
        console.log(`  Progress: ${Math.min(i + BATCH_SIZE, linksToCreate.length)}/${linksToCreate.length}`);
      } catch (err: any) {
        // If batch fails, try one by one
        for (const linkDef of batch) {
          try {
            await link.create([linkDef]);
            linked++;
          } catch (e: any) {
            if (e.message?.includes("already exists") || e.message?.includes("duplicate")) {
              alreadyLinked++;
            }
          }
        }
      }
    }
  }

  console.log("\n=== FINAL SUMMARY ===");
  console.log(`Total products: ${products.length}`);
  console.log(`Links created: ${linked}`);
  console.log(`Already linked: ${alreadyLinked}`);
  console.log(`No matching brand: ${noMatch}`);

  if (noMatchVendors.size > 0) {
    console.log("\n=== VENDORS WITHOUT MATCHING BRAND ===");
    const sorted = [...noMatchVendors.entries()].sort((a, b) => b[1] - a[1]);
    sorted.slice(0, 20).forEach(([vendor, count]) => {
      console.log(`  ${vendor}: ${count} products`);
    });
    if (sorted.length > 20) {
      console.log(`  ... and ${sorted.length - 20} more`);
    }
  }

  // Also update product metadata with brand_id for easier lookups
  console.log("\n=== UPDATING PRODUCT METADATA ===");
  let metadataUpdated = 0;
  
  for (const product of products) {
    const vendor = product.metadata?.vendor as string;
    if (!vendor) continue;
    
    let brand = brandByName.get(vendor.toLowerCase());
    if (!brand) {
      const mappedName = VENDOR_TO_BRAND[vendor] || VENDOR_TO_BRAND[vendor.toLowerCase()];
      if (mappedName) {
        brand = brandByName.get(mappedName.toLowerCase());
      }
    }
    if (!brand) {
      for (const [name, b] of brandByName) {
        if (name.includes(vendor.toLowerCase()) || vendor.toLowerCase().includes(name)) {
          brand = b;
          break;
        }
      }
    }
    
    if (brand && product.metadata?.brand_id !== brand.id) {
      try {
        await productModule.updateProducts(product.id, {
          metadata: {
            ...product.metadata,
            brand_id: brand.id,
          },
        });
        metadataUpdated++;
      } catch (e) {
        // Continue on error
      }
    }
  }
  
  console.log(`Updated ${metadataUpdated} product metadata records with brand_id`);

  return { linked, alreadyLinked, noMatch, metadataUpdated };
}
