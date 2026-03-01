import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { BRAND_MODULE } from "../modules/brand";

// Vendor name to brand name mapping (for mismatches)
const VENDOR_TO_BRAND: Record<string, string> = {
  "BIGTREETECH": "BIGTREETECH",
  "BTT": "BIGTREETECH",
  "Creality": "Creality",
  "LDO": "LDO",
  "Trianglelab": "Trianglelab",
  "Triangle Lab": "Trianglelab",
  "Micro Swiss": "Micro Swiss",
  "MicroSwiss": "Micro Swiss",
  "Fysetc": "Fysetc",
  "E3D": "E3D",
  "E3D-Online": "E3D",
  "Bondtech": "Bondtech",
  "Phaetus": "Phaetus",
  "Sovol": "Sovol",
  "Anycubic": "Anycubic",
  "Slice Engineering": "Slice Engineering",
  "Gates": "Gates",
  "CNC Kitchen": "CNC Kitchen",
  "QIDI TECH": "QIDI TECH",
  "Qidi": "QIDI TECH",
  "Duet3D": "Duet3D",
  "Mellow3D": "Mellow3D",
  "Fabreeko": "Fabreeko",
  "Flashforge": "Flashforge",
  "Molex": "Molex",
  "GDSTIME": "GDSTIME",
  "West3D": "West3D",
  "Mean Well": "Mean Well",
  "DEVIL DESIGN": "DEVIL DESIGN",
  "Cartographer3D": "Cartographer3D",
  "Cookiecad": "Cookiecad",
  "Pine64": "Pine64",
  "Omron": "Omron",
  "MISUMI": "MISUMI",
  "Vector 3D": "Vector 3D",
  "Sunon": "Sunon",
  "AG": "AG",
  "Capricorn": "Capricorn",
  "Miniware": "Miniware",
  "Wago": "Wago",
  "ANTCLABS": "ANTCLABS",
  "Polymaker": "Polymaker",
};

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const brandModule = container.resolve(BRAND_MODULE);
  
  console.log('=== FIXING BRAND LINKS ===\n');
  
  // Get all brands and create name->id map
  const brands = await brandModule.listBrands({}, { select: ['id', 'name', 'handle'] });
  const brandByName = new Map(brands.map(b => [b.name.toLowerCase(), b]));
  const brandByHandle = new Map(brands.map(b => [b.handle.toLowerCase(), b]));
  
  console.log(`Found ${brands.length} brands`);
  
  // Get all products without brand_id
  const products = await productModule.listProducts({}, { 
    select: ['id', 'handle', 'metadata'] 
  });
  
  const productsWithoutBrand = products.filter(p => !p.metadata?.brand_id);
  console.log(`Products without brand: ${productsWithoutBrand.length}\n`);
  
  let linked = 0;
  let noMatch = 0;
  const noMatchVendors = new Set<string>();
  
  for (const product of productsWithoutBrand) {
    const vendor = product.metadata?.vendor as string;
    if (!vendor) {
      noMatchVendors.add('(no vendor)');
      noMatch++;
      continue;
    }
    
    // Try to find matching brand
    let brand = brandByName.get(vendor.toLowerCase());
    if (!brand) {
      // Try mapping
      const mappedName = VENDOR_TO_BRAND[vendor];
      if (mappedName) {
        brand = brandByName.get(mappedName.toLowerCase());
      }
    }
    if (!brand) {
      // Try partial match
      for (const [name, b] of brandByName) {
        if (name.includes(vendor.toLowerCase()) || vendor.toLowerCase().includes(name)) {
          brand = b;
          break;
        }
      }
    }
    
    if (brand) {
      // Update product with brand_id in metadata and brand relation
      await productModule.updateProducts(product.id, {
        metadata: {
          ...product.metadata,
          brand_id: brand.id,
        },
      });
      
      // Also set the brand relation if there's a brand_id field
      try {
        await productModule.updateProducts(product.id, {
          brand_id: brand.id,
        } as any);
      } catch (e) {
        // Field might not exist, that's OK
      }
      
      linked++;
      if (linked % 50 === 0) {
        console.log(`  Linked ${linked}/${productsWithoutBrand.length}...`);
      }
    } else {
      noMatchVendors.add(vendor);
      noMatch++;
    }
  }
  
  console.log(`\n=== RESULTS ===`);
  console.log(`Linked: ${linked}`);
  console.log(`No match: ${noMatch}`);
  
  if (noMatchVendors.size > 0 && noMatchVendors.size <= 20) {
    console.log('\nVendors without matching brand:');
    noMatchVendors.forEach(v => console.log(`  - ${v}`));
  }
  
  return { linked, noMatch };
}
