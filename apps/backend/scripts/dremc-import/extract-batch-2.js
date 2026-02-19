#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DREMC_URL = 'https://dremc.com.au';
const DELAY_MS = 3000;

// Already imported in batch 1
const batch1Products = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/products-batch-1.json'), 'utf8')
).products;
const batch1Ids = new Set(batch1Products.map(p => p.dremc_id));

console.log(`Batch 1 had ${batch1Ids.size} products - will skip these`);

// Collections to scrape - more variety
const collections = [
  '3d-printer-accessories-and-consumable',
  '3d-printer-parts',
  '3d-printer-hotend-accessories',
  '3d-printer-electronics',
  '3d-printer-wearing-parts',
  '3d-printer-extruder',
  '3d-printer-mainboard',
  '3d-printers-nozzles',
  '3d-consumable',
  '3d-printer-fans',
  '3d-printer-thermistor',
  '3d-printer-heater-cartridge',
  '3d-printer-bed-surface-accessories',
  '3d-printer-displays',
];

const excludedVendors = ['DREMC', 'DREMC-STORE'];

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchProducts(collection, page = 2) {  // Start from page 2
  const url = `${DREMC_URL}/collections/${collection}/products.json?page=${page}&limit=250`;
  const response = await fetch(url);
  return response.json();
}

function mapCategory(collectionHandle) {
  const mapping = {
    '3d-printer-accessories-and-consumable': 'accessories',
    '3d-printer-parts': 'spare-parts',
    '3d-printer-hotend-accessories': 'spare-parts/hotends',
    '3d-printer-electronics': 'electronics',
    '3d-printer-wearing-parts': 'spare-parts',
    '3d-printer-extruder': 'spare-parts/extruders',
    '3d-printer-mainboard': 'electronics/mainboards',
    '3d-printers-nozzles': 'spare-parts/nozzles',
    '3d-consumable': 'filament',
  };
  return mapping[collectionHandle] || 'accessories';
}

async function main() {
  const allProducts = [];
  const seen = new Set();
  
  for (const collection of collections) {
    console.log(`\nFetching collection: ${collection}`);
    
    try {
      const data = await fetchProducts(collection);
      const products = data.products || [];
      
      for (const product of products) {
        // Skip if already in batch 1
        if (batch1Ids.has(product.id)) continue;
        
        // Skip excluded vendors
        if (excludedVendors.includes(product.vendor)) continue;
        
        // Skip duplicates
        if (seen.has(product.id)) continue;
        seen.add(product.id);
        
        const productData = {
          dremc_id: product.id,
          title: product.title,
          handle: product.handle, // NO dremc- prefix!
          vendor: product.vendor,
          product_type: product.product_type || 'Spare Parts',
          sku: product.variants?.[0]?.sku || product.handle,
          price: parseFloat(product.variants?.[0]?.price || '0'),
          compare_at_price: product.variants?.[0]?.compare_at_price ? parseFloat(product.variants[0].compare_at_price) : null,
          images: product.images?.map(i => i.src) || [],
          tags: Array.isArray(product.tags) ? product.tags : (product.tags?.split(', ').filter(t => t) || []),
          collection_handles: [collection],
          body_html: product.body_html,
          variants: product.variants?.map(v => ({
            id: v.id,
            title: v.title,
            sku: v.sku,
            price: parseFloat(v.price || '0'),
            options: v.option_values,
          })) || [],
          mapped_category: mapCategory(collection),
        };
        
        allProducts.push(productData);
      }
      
      await delay(DELAY_MS);
    } catch (err) {
      console.error(`Error fetching ${collection}: ${err.message}`);
    }
    
    // Stop if we have enough
    if (allProducts.length >= 50) break;
  }
  
  // Take first 50
  const batch2 = allProducts.slice(0, 50);
  
  const output = {
    batch: 2,
    extracted_at: new Date().toISOString(),
    total_products: batch2.length,
    products: batch2,
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'data/products-batch-2.json'),
    JSON.stringify(output, null, 2)
  );
  
  console.log(`\n✅ Extracted ${batch2.length} products for batch 2`);
  
  // Stats
  const vendors = {};
  batch2.forEach(p => {
    vendors[p.vendor] = (vendors[p.vendor] || 0) + 1;
  });
  console.log('\nBy vendor:');
  Object.entries(vendors).sort((a, b) => b[1] - a[1]).forEach(([v, c]) => {
    console.log(`  ${v}: ${c}`);
  });
}

main().catch(console.error);
