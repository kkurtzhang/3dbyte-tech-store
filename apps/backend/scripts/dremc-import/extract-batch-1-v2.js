#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, 'data');
const DREMC_STORE_URL = 'https://store.dremc.com.au';
const USER_AGENT = '3DByte-Tech-Data-Research/1.0';

// Load collections
const collections = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dremc-collections.json'), 'utf8'));

// Load vendors
const vendors = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dremc-vendors.json'), 'utf8'));
const approvedVendors = new Set(vendors.map(v => v.name));

// Category mapping
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

// Delay helper for rate limiting
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch products from a collection
function fetchCollectionProducts(collectionHandle) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'store.dremc.com.au',
      port: 443,
      path: `/collections/${collectionHandle}/products.json`,
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
          resolve({
            products: json.products || [],
            collection: collectionHandle,
          });
        } catch (e) {
          reject(new Error(`Failed to parse JSON for ${collectionHandle}: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.warn(`  ⚠ Failed to fetch ${collectionHandle}: ${error.message}`);
      resolve({ products: [], collection: collectionHandle, error: error.message });
    });
    req.setTimeout(30000, () => {
      req.destroy();
      console.warn(`  ⚠ Timeout for ${collectionHandle}`);
      resolve({ products: [], collection: collectionHandle, error: 'Timeout' });
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
  const excludedVendors = new Set(['DREMC', 'DREMC-STORE']);
  const allProductsMap = new Map(); // Use Map to deduplicate by product ID
  const processedCollections = [];

  console.log('Fetching products from collections...\n');

  // Prioritize collections with most products
  const sortedCollections = [...collections]
    .sort((a, b) => b.products_count - a.products_count);

  let collectionIndex = 0;
  let totalProducts = 0;

  // Fetch from collections until we have enough products
  while (totalProducts < 100 && collectionIndex < sortedCollections.length) {
    const collection = sortedCollections[collectionIndex];
    const collectionHandle = collection.handle;

    console.log(`Fetching collection ${collectionIndex + 1}/${sortedCollections.length}: ${collection.title} (${collection.products_count} products)`);

    const result = await fetchCollectionProducts(collectionHandle);
    processedCollections.push({
      handle: collectionHandle,
      title: collection.title,
      products_fetched: result.products.length,
      error: result.error,
    });

    // Process products
    for (const product of result.products) {
      const vendor = product.vendor || 'Unknown';

      // Skip excluded vendors
      if (excludedVendors.has(vendor)) {
        continue;
      }

      // Only include approved vendors
      if (!approvedVendors.has(vendor)) {
        continue;
      }

      // Check for images
      if (!product.images || product.images.length === 0) {
        continue;
      }

      // Deduplicate by product ID
      if (allProductsMap.has(product.id)) {
        // Update existing product with this collection if needed
        const existing = allProductsMap.get(product.id);
        if (!existing.collection_handles.includes(collectionHandle)) {
          existing.collection_handles.push(collectionHandle);
        }
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
        collection_handles: [collectionHandle],
        body_html: product.body_html || '',
        category: mapCollectionToCategory(collectionHandle),
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

      allProductsMap.set(product.id, productData);
      totalProducts = allProductsMap.size;
    }

    console.log(`  → Found ${allProductsMap.size} unique products so far`);

    // Rate limiting: 3 second delay between requests
    if (collectionIndex < sortedCollections.length - 1) {
      await delay(3000);
    }

    collectionIndex++;
  }

  console.log(`\n✓ Total unique products fetched: ${allProductsMap.size}`);

  // Convert Map to array and limit to 50
  const allProducts = Array.from(allProductsMap.values());
  const batchProducts = allProducts.slice(0, 50);

  console.log(`✓ Selected batch of ${batchProducts.length} products`);

  // Generate report
  const byVendor = {};
  batchProducts.forEach(p => {
    byVendor[p.vendor] = (byVendor[p.vendor] || 0) + 1;
  });

  const byCategory = {};
  batchProducts.forEach(p => {
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

  console.log('\n=== Collections Processed ===');
  processedCollections.forEach(c => {
    const status = c.error ? `❌ ${c.error}` : `✓ ${c.products_fetched} products`;
    console.log(`  ${c.title}: ${status}`);
  });

  // Create output object
  const output = {
    batch: 1,
    extracted_at: new Date().toISOString(),
    total_products: batchProducts.length,
    products: batchProducts,
  };

  // Save to file
  const outputPath = path.join(DATA_DIR, 'products-batch-1.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✓ Batch 1 saved to: ${outputPath}`);

  // Save metadata
  const metadataPath = path.join(DATA_DIR, 'products-batch-1-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify({
    batch: 1,
    extracted_at: new Date().toISOString(),
    total_products_fetched: allProductsMap.size,
    batch_size: batchProducts.length,
    by_vendor: byVendor,
    by_category: byCategory,
    collections_processed: processedCollections,
  }, null, 2));
  console.log(`✓ Metadata saved to: ${metadataPath}`);

  return {
    total_extracted: batchProducts.length,
    total_fetched: allProductsMap.size,
    by_vendor: byVendor,
    by_category: byCategory,
  };
}

// Run extraction
extractBatch1()
  .then(result => {
    console.log('\n=== Extraction Complete ===');
    console.log(`Total fetched: ${result.total_fetched}`);
    console.log(`Batch size: ${result.total_extracted}`);
  })
  .catch(error => {
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
