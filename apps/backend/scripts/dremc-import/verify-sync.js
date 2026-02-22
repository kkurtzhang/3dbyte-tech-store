// Verify Strapi and Medusa are synced
const STRAPI_URL = 'http://192.168.0.45:1337';
const STRAPI_TOKEN = 'c68fec065347ba6ae663ed352446548d0b8cbb376103def7a1129eb7e7c5780361877b926787403d3eb6e387191a7cd8c9c844f7d9bd96610bce7a0c9d0832c73d0921476f32746ee5934333bc1629128cd9cb3c8ca6eeb391ffd0cbaffb9aca71e644c54e35662db95d8e12b514a302ae3d12413ee5a01b2f7de7b6fa2a93cb';

async function fetchAllStrapi() {
  const all = [];
  let page = 1;
  while (true) {
    // Use URL-encoded brackets for Strapi v5
    const url = `${STRAPI_URL}/api/product-descriptions?pagination%5Bpage%5D=${page}&pagination%5BpageSize%5D=100`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
    });
    const data = await res.json();
    if (!data.data || data.data.length === 0) break;
    all.push(...data.data);
    console.log(`  Fetched page ${page}: ${data.data.length} entries (total: ${all.length})`);
    if (data.data.length < 100) break;
    page++;
  }
  return all;
}

async function main() {
  console.log('=== Strapi <-> Medusa Sync Verification ===\n');
  
  // Fetch Strapi entries
  console.log('Fetching Strapi entries...');
  const strapiEntries = await fetchAllStrapi();
  console.log(`\nStrapi product-descriptions: ${strapiEntries.length}`);
  
  // Create maps
  const strapiByHandle = new Map();
  
  for (const entry of strapiEntries) {
    if (entry.product_handle) strapiByHandle.set(entry.product_handle, entry);
  }
  
  console.log(`  - With product_handle: ${strapiByHandle.size}`);
  
  // Load expected products from batch files
  const fs = require('fs');
  const path = require('path');
  
  const expectedHandles = new Set();
  
  // Load batches 1-4
  for (let i = 1; i <= 4; i++) {
    try {
      const batchPath = path.join(__dirname, `data/products-batch-${i}.json`);
      const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
      batch.products.forEach(p => expectedHandles.add(p.handle));
      console.log(`  Batch ${i}: ${batch.products.length} products`);
    } catch (e) {}
  }
  
  // Load fresh batch 1
  try {
    const fresh1Path = path.join(__dirname, 'data/fresh-batch-1.json');
    const fresh1 = JSON.parse(fs.readFileSync(fresh1Path, 'utf8'));
    fresh1.products.forEach(p => expectedHandles.add(p.handle));
    console.log(`  Fresh batch 1: ${fresh1.products.length} products`);
  } catch (e) {}
  
  console.log(`\nExpected products (from imported batches): ${expectedHandles.size}`);
  
  // Find discrepancies
  const inStrapiNotImported = [];
  const importedNotInStrapi = [];
  
  for (const entry of strapiEntries) {
    if (!expectedHandles.has(entry.product_handle)) {
      inStrapiNotImported.push(entry.product_handle);
    }
  }
  
  for (const handle of expectedHandles) {
    if (!strapiByHandle.has(handle)) {
      importedNotInStrapi.push(handle);
    }
  }
  
  console.log(`\n=== DISCREPANCIES ===`);
  console.log(`In Strapi but not in imported batches: ${inStrapiNotImported.length}`);
  console.log(`In imported batches but not in Strapi: ${importedNotInStrapi.length}`);
  
  if (inStrapiNotImported.length > 0 && inStrapiNotImported.length <= 30) {
    console.log('\n  Extra in Strapi:');
    inStrapiNotImported.slice(0, 15).forEach(h => console.log(`    - ${h}`));
    if (inStrapiNotImported.length > 15) console.log(`    ... and ${inStrapiNotImported.length - 15} more`);
  }
  
  if (importedNotInStrapi.length > 0 && importedNotInStrapi.length <= 30) {
    console.log('\n  Missing from Strapi:');
    importedNotInStrapi.slice(0, 15).forEach(h => console.log(`    - ${h}`));
    if (importedNotInStrapi.length > 15) console.log(`    ... and ${importedNotInStrapi.length - 15} more`);
  }
  
  // Summary
  if (inStrapiNotImported.length === 0 && importedNotInStrapi.length === 0) {
    console.log('\n✅ Strapi and Medusa are in sync!');
  } else {
    console.log('\n⚠️  Sync needed');
  }
}

main().catch(console.error);
