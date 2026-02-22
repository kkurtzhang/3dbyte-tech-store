// Sync check - compare Medusa products with Strapi product-descriptions
const STRAPI_URL = 'http://192.168.0.45:1337';
const STRAPI_TOKEN = 'c68fec065347ba6ae663ed352446548d0b8cbb376103def7a1129eb7e7c5780361877b926787403d3eb6e387191a7cd8c9c844f7d9bd96610bce7a0c9d0832c73d0921476f32746ee5934333bc1629128cd9cb3c8ca6eeb391ffd0cbaffb9aca71e644c54e35662db95d8e12b514a302ae3d12413ee5a01b2f7de7b6fa2a93cb';

async function fetchStrapi(path) {
  const url = `${STRAPI_URL}/api/${path}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
  });
  return res.json();
}

async function deleteStrapi(collection, id) {
  const url = `${STRAPI_URL}/api/${collection}/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
  });
  return res.json();
}

async function main() {
  // 1. Get all product-descriptions from Strapi
  console.log('Fetching product-descriptions from Strapi...');
  let allDescriptions = [];
  let page = 1;
  let pageSize = 100;
  
  while (true) {
    const data = await fetchStrapi(`product-descriptions?pagination[page]=${page}&pagination[pageSize]=${pageSize}&fields[0]=productHandle&fields[1]=title&fields[2]=dremcId`);
    if (!data.data || data.data.length === 0) break;
    allDescriptions.push(...data.data);
    console.log(`  Page ${page}: ${data.data.length} entries (total: ${allDescriptions.length})`);
    if (data.data.length < pageSize) break;
    page++;
  }
  
  console.log(`\nTotal product-descriptions in Strapi: ${allDescriptions.length}`);
  
  // 2. Get valid product handles from our imported data
  const fs = require('fs');
  const path = require('path');
  
  const validHandles = new Set();
  const validDremcIds = new Set();
  
  // Load from batch files
  for (let i = 1; i <= 4; i++) {
    try {
      const batchPath = path.join(__dirname, 'data/products-batch-' + i + '.json');
      const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
      batch.products.forEach(p => {
        const cleanHandle = p.handle.replace(/[^\w-]/g, '').toLowerCase();
        validHandles.add(cleanHandle);
        validDremcIds.add(String(p.dremc_id));
      });
    } catch (e) {}
  }
  
  console.log(`Valid product handles (from imported batches): ${validHandles.size}`);
  console.log(`Valid DREMC IDs: ${validDremcIds.size}`);
  
  // 3. Find orphaned descriptions (not matching any imported product)
  const orphaned = [];
  const matched = [];
  
  for (const desc of allDescriptions) {
    const handle = desc.attributes?.productHandle || '';
    const dremcId = desc.attributes?.dremcId ? String(desc.attributes.dremcId) : null;
    
    const isMatched = validHandles.has(handle) || (dremcId && validDremcIds.has(dremcId));
    
    if (isMatched) {
      matched.push(desc);
    } else {
      orphaned.push(desc);
    }
  }
  
  console.log(`\n=== COMPARISON RESULTS ===`);
  console.log(`Matched descriptions: ${matched.length}`);
  console.log(`Orphaned descriptions: ${orphaned.length}`);
  
  if (orphaned.length > 0) {
    console.log('\n=== ORPHANED ENTRIES (first 20) ===');
    orphaned.slice(0, 20).forEach(d => {
      console.log(`  ID ${d.id}: "${d.attributes?.title?.substring(0, 40) || 'no title'}..." (handle: ${d.attributes?.productHandle || 'none'})`);
    });
    
    // Ask to delete
    console.log(`\n⚠️  Found ${orphaned.length} orphaned product-descriptions.`);
    console.log('To delete them, run with --delete flag');
    
    if (process.argv.includes('--delete')) {
      console.log('\nDeleting orphaned entries...');
      let deleted = 0;
      for (const desc of orphaned) {
        try {
          await deleteStrapi('product-descriptions', desc.id);
          deleted++;
          process.stdout.write(`\r  Deleted: ${deleted}/${orphaned.length}`);
        } catch (e) {
          console.log(`\n  Failed to delete ${desc.id}: ${e.message}`);
        }
      }
      console.log(`\n\n✅ Deleted ${deleted} orphaned entries`);
    }
  } else {
    console.log('\n✅ No orphaned entries found - Strapi and Medusa are in sync!');
  }
}

main().catch(console.error);
