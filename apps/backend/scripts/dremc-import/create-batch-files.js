// Create batch files from fresh-extract for parallel import
const fs = require('fs');
const path = require('path');

const BATCH_SIZE = 50;

async function main() {
  // Load fresh extract
  const freshPath = path.join(__dirname, 'data/products-fresh-extract.json');
  const fresh = JSON.parse(fs.readFileSync(freshPath, 'utf8'));
  
  console.log(`Total products in fresh-extract: ${fresh.products.length}`);
  
  // Create batch 2 (products 51-100, indices 50-99)
  const batch2Products = fresh.products.slice(50, 100);
  
  if (batch2Products.length > 0) {
    const batch2 = {
      extracted_at: new Date().toISOString(),
      total_products: batch2Products.length,
      batch_number: 2,
      products: batch2Products,
    };
    
    const batch2Path = path.join(__dirname, 'data/fresh-batch-2.json');
    fs.writeFileSync(batch2Path, JSON.stringify(batch2, null, 2));
    console.log(`\n✅ Created fresh-batch-2.json with ${batch2Products.length} products`);
    
    // Show vendors in this batch
    const vendors = {};
    batch2Products.forEach(p => {
      vendors[p.vendor] = (vendors[p.vendor] || 0) + 1;
    });
    console.log('\nVendors in batch 2:');
    Object.entries(vendors).sort((a, b) => b[1] - a[1]).forEach(([v, c]) => {
      console.log(`  ${v}: ${c}`);
    });
  }
  
  // Also create batches 3-22 for future imports
  for (let i = 3; i <= 22; i++) {
    const start = (i - 1) * BATCH_SIZE;
    const end = start + BATCH_SIZE;
    const batchProducts = fresh.products.slice(start, end);
    
    if (batchProducts.length === 0) break;
    
    const batch = {
      extracted_at: new Date().toISOString(),
      total_products: batchProducts.length,
      batch_number: i,
      products: batchProducts,
    };
    
    const batchPath = path.join(__dirname, `data/fresh-batch-${i}.json`);
    fs.writeFileSync(batchPath, JSON.stringify(batch, null, 2));
    console.log(`Created fresh-batch-${i}.json with ${batchProducts.length} products`);
  }
}

main().catch(console.error);
