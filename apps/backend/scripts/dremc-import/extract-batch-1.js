#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, 'data');
const DREMC_STORE_URL = 'https://store.dremc.com.au';
const USER_AGENT = '3DByte-Tech-Data-Research/1.0';

// Load collections for category mapping
const collections = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dremc-collections.json'), 'utf8'));

// Load vendors
const vendors = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dremc-vendors.json'), 'utf8'));
const approvedVendors = new Set(vendors.map(v => v.name));

// Category mapping (simplified version from config/category-mapping.ts)
const CATEGORY_MAPPING = {
  "3d-printer-kits": "3d-printers",
  "3d-consumable": "filament",
  "abs-asa-filament-1-75mm": "filament/abs-asa",
  "3d-printer-parts": "spare-parts",
  "3d-printer-extruder-spares": "spare-parts/extruders",
  "3d-printer-wearing-parts": "spare-parts",
  "3d-printer-hotend-accessories": "spare-parts/hotends",
  "3d-printer-heat-breaks": "spare-parts/hotends",
  "3d-printers-nozzles": "spare-parts/nozzles",
  "3d-printer-extruder": "spare-parts/extruders",
  "3d-printer-thermistor": "spare-parts/thermistors",
  "3d-printer-heater-cartridge": "spare-parts/heater-cartridges",
  "3d-printer-bed": "spare-parts/beds",
  "3d-printer-electronics": "electronics",
  "3d-printer-mainboard": "electronics/mainboards",
  "3d-printer-displays": "electronics/displays",
  "3d-printer-bearing-pom-wheels": "motion/bearings",
  "3d-printer-fans": "motion",
  "3d-printer-bed-surface-accessories": "build-plates",
  "3d-printer-tools-and-general-spares": "tools",
  "3d-printer-accessories-and-consumable": "accessories",
  "3d-printer-silicon-socks": "accessories",
  "3d-printer-heater-block": "accessories",
  "3d-printer-bed-probe": "accessories",
  "3d-printer-toolheads": "accessories",
};

// Fetch products from DREMC store
function fetchProducts() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'store.dremc.com.au',
      port: 443,
      path: '/products.json',
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.products || []);
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Map collection handle to category
function mapCollectionToCategory(collectionHandle) {
  if (!collectionHandle) return 'accessories';
  return CATEGORY_MAPPING[collectionHandle] || 'accessories';
}

// Extract and filter products
async function extractBatch1() {
  console.log('Fetching products from DREMC store...');
  const allProducts = await fetchProducts();
  console.log(`Total products fetched: ${allProducts.length}`);

  const excludedVendors = new Set(['DREMC', 'DREMC-STORE']);
  
  // Filter products
  const filteredProducts = [];
  const skippedProducts = [];

  for (const product of allProducts) {
    const vendor = product.vendor || 'Unknown';
    
    // Skip excluded vendors
    if (excludedVendors.has(vendor)) {
      skippedProducts.push({
        dremc_id: product.id,
        title: product.title,
        vendor: vendor,
        reason: 'Excluded vendor'
      });
      continue;
    }

    // Only include approved vendors
    if (!approvedVendors.has(vendor)) {
      skippedProducts.push({
        dremc_id: product.id,
        title: product.title,
        vendor: vendor,
        reason: 'Not in approved vendor list'
      });
      continue;
    }

    // Check for images
    if (!product.images || product.images.length === 0) {
      skippedProducts.push({
        dremc_id: product.id,
        title: product.title,
        vendor: vendor,
        reason: 'No images'
      });
      continue;
    }

    // Extract product data
    const productData = {
      dremc_id: product.id.toString(),
      title: product.title,
      handle: product.handle,
      vendor: vendor,
      product_type: product.product_type || 'Unknown',
      sku: product.variants?.[0]?.sku || null,
      price: parseFloat(product.variants?.[0]?.price) || 0,
      compare_at_price: product.variants?.[0]?.compare_at_price 
        ? parseFloat(product.variants[0].compare_at_price) 
        : null,
      images: product.images.map(img => img.src),
      tags: product.tags || [],
      collection_handles: [],  // Will be filled if we have collection data
      body_html: product.body_html || '',
      variants: (product.variants || []).map(v => ({
        id: v.id.toString(),
        title: v.title,
        sku: v.sku,
        price: parseFloat(v.price),
        compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
        available: v.available,
        option1: v.option1,
        option2: v.option2,
        option3: v.option3,
      })),
    };

    // Add collection category
    // Note: Shopify products.json doesn't include collections, so we'll default to accessories
    // In a real implementation, we'd need to fetch product collections separately
    productData.category = 'accessories';

    filteredProducts.push(productData);

    // Stop when we have 50 products
    if (filteredProducts.length >= 50) {
      break;
    }
  }

  console.log(`\nFiltered products: ${filteredProducts.length}`);
  console.log(`Skipped products: ${skippedProducts.length}`);

  // Generate report
  const byVendor = {};
  filteredProducts.forEach(p => {
    byVendor[p.vendor] = (byVendor[p.vendor] || 0) + 1;
  });

  const byCategory = {};
  filteredProducts.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  });

  console.log('\n=== Products by Vendor ===');
  Object.entries(byVendor).sort((a, b) => b[1] - a[1]).forEach(([vendor, count]) => {
    console.log(`  ${vendor}: ${count}`);
  });

  console.log('\n=== Products by Category ===');
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([category, count]) => {
    console.log(`  ${category}: ${count}`);
  });

  console.log('\n=== Skipped Products (sample) ===');
  skippedProducts.slice(0, 10).forEach(p => {
    console.log(`  ${p.title} (${p.vendor}) - ${p.reason}`);
  });
  if (skippedProducts.length > 10) {
    console.log(`  ... and ${skippedProducts.length - 10} more`);
  }

  // Create output object
  const output = {
    batch: 1,
    extracted_at: new Date().toISOString(),
    total_products: filteredProducts.length,
    products: filteredProducts,
  };

  // Save to file
  const outputPath = path.join(DATA_DIR, 'products-batch-1.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✓ Batch 1 saved to: ${outputPath}`);

  // Save skipped products report
  const skippedPath = path.join(DATA_DIR, 'products-batch-1-skipped.json');
  fs.writeFileSync(skippedPath, JSON.stringify(skippedProducts, null, 2));
  console.log(`✓ Skipped products report saved to: ${skippedPath}`);

  return {
    total_extracted: filteredProducts.length,
    by_vendor: byVendor,
    by_category: byCategory,
    skipped_count: skippedProducts.length,
  };
}

// Run extraction
extractBatch1()
  .then(result => {
    console.log('\n=== Extraction Complete ===');
    console.log(`Total extracted: ${result.total_extracted}`);
    console.log(`Skipped: ${result.skipped_count}`);
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
