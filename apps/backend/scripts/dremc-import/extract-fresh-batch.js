#!/usr/bin/env node
/**
 * DREMC Product Extractor - Fresh Extract Approach
 * 
 * Fetches ALL products from /products.json endpoint (not collections)
 * This avoids duplicate products that appear across multiple collections.
 * 
 * Usage: node extract-fresh-batch.js
 */

const fs = require('fs');
const path = require('path');

const DREMC_URL = 'https://dremc.com.au';
const DELAY_MS = 3000;

// Excluded vendors (DREMC own brand)
const excludedVendors = ['DREMC', 'DREMC-STORE'];

// Load already imported product IDs from all existing batches
const importedIds = new Set();
for (let i = 1; i <= 5; i++) {
  try {
    const batchPath = path.join(__dirname, `data/products-batch-${i}.json`);
    const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
    batch.products.forEach(p => importedIds.add(String(p.dremc_id)));
  } catch (e) {}
}
console.log(`Already extracted: ${importedIds.size} product IDs`);

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Fetch products from /products.json endpoint
async function fetchProductsPage(page = 1, limit = 250) {
  const url = `${DREMC_URL}/products.json?limit=${limit}&page=${page}`;
  console.log(`Fetching page ${page}...`);
  const response = await fetch(url);
  const data = await response.json();
  return data.products || [];
}

// Category mapping based on product_type
function mapCategory(productType) {
  const typeMap = {
    'Spare Parts': 'spare-parts',
    'Hotend Assembly': 'spare-parts/hotends',
    'Hotend Kit': 'spare-parts/hotends',
    'Nozzle': 'spare-parts/nozzles',
    'Extruder': 'spare-parts/extruders',
    'Direct Drive': 'spare-parts/extruders',
    'Mainboard': 'electronics/mainboards',
    'Stepper Motor': 'motion',
    'Timing Belt': 'motion',
    'Build Surface': 'build-plates',
    'PEI Plate': 'build-plates',
    'Linear Rail': 'motion',
    'Fan': 'spare-parts',
    'Thermistor': 'spare-parts/thermistors',
    'Heater Cartridge': 'spare-parts/heater-cartridges',
    'Tools': 'tools',
    'Upgrade Kit': 'accessories',
    'Project': 'accessories',
    'Hardware': 'accessories',
    '3D Printing Consumable': 'accessories',
    'Filament Dryer': 'accessories',
    'End Mill': 'accessories',
  };
  return typeMap[productType] || 'accessories';
}

async function main() {
  const allProducts = [];
  const seen = new Set();
  let page = 1;
  let totalFetched = 0;
  let totalPages = 0;

  // Fetch all products from /products.json
  while (true) {
    const products = await fetchProductsPage(page);
    totalPages++;
    
    if (products.length === 0) {
      console.log('No more products, stopping.');
      break;
    }
    
    totalFetched += products.length;
    
    for (const product of products) {
      // Skip if already imported
      if (importedIds.has(String(product.id))) continue;
      
      // Skip excluded vendors
      if (excludedVendors.includes(product.vendor)) continue;
      
      // Skip duplicates
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      
      const productData = {
        dremc_id: product.id,
        title: product.title,
        handle: product.handle,
        vendor: product.vendor,
        product_type: product.product_type || 'Spare Parts',
        sku: product.variants?.[0]?.sku || product.handle,
        price: parseFloat(product.variants?.[0]?.price || '0'),
        compare_at_price: product.variants?.[0]?.compare_at_price ? parseFloat(product.variants[0].compare_at_price) : null,
        images: product.images?.map(i => i.src) || [],
        tags: Array.isArray(product.tags) ? product.tags : [],
        body_html: product.body_html,
        variants: product.variants?.map(v => ({
          id: v.id,
          title: v.title,
          sku: v.sku,
          price: parseFloat(v.price || '0'),
          options: v.option_values,
        })) || [],
        mapped_category: mapCategory(product.product_type),
      };
      
      allProducts.push(productData);
    }
    
    console.log(`Page ${page}: ${products.length} products fetched, ${allProducts.length} new unique so far`);
    page++;
    await delay(DELAY_MS);
    
    // Safety limit
    if (page > 20) {
      console.log('Reached page limit (20), stopping.');
      break;
    }
  }
  
  console.log(`\n=== EXTRACTION SUMMARY ===`);
  console.log(`Total products fetched: ${totalFetched}`);
  console.log(`Pages processed: ${totalPages}`);
  console.log(`New unique products (after filtering): ${allProducts.length}`);
  
  // Save all new products
  if (allProducts.length > 0) {
    const outputPath = path.join(__dirname, 'data/products-fresh-extract.json');
    const output = {
      extracted_at: new Date().toISOString(),
      total_products: allProducts.length,
      source: '/products.json endpoint',
      products: allProducts,
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n✅ Saved ${allProducts.length} new products to products-fresh-extract.json`);
    
    // Vendor breakdown
    const vendors = {};
    allProducts.forEach(p => {
      vendors[p.vendor] = (vendors[p.vendor] || 0) + 1;
    });
    console.log('\nBy vendor:');
    Object.entries(vendors).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([v, c]) => {
      console.log(`  ${v}: ${c}`);
    });
  } else {
    console.log('\n⚠️ No new products found - all products already imported');
  }
}

main().catch(console.error);
